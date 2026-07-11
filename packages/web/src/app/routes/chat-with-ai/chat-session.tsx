import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { CircleCheck, Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { ConfirmationDeleteDialog } from '@/components/custom/delete-dialog';
import { PageHeader } from '@/components/custom/page-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { chatApi } from '@/features/chat/lib/chat-api';
import {
  chatConversationsCache,
  useChatConversations,
} from '@/features/chat/lib/chat-conversations';
import { chatUtils } from '@/features/chat/lib/chat-utils';

import { AIChatBox } from './ai-chat-box';
import {
  ChatLayoutToggle,
  ChatLayoutMode,
} from './components/chat-layout-toggle';
import { TypewriterText } from './components/typewriter-text';

export function ChatSession({
  conversationId,
  onNewChat,
  onConversationCreated,
  layoutMode,
  onLayoutModeChange,
}: {
  conversationId: string | null;
  onNewChat: () => void;
  onConversationCreated: (conversationId: string) => void;
  layoutMode: ChatLayoutMode;
  onLayoutModeChange?: (mode: ChatLayoutMode) => void;
}) {
  const queryClient = useQueryClient();
  const { data: conversationsPage } = useChatConversations();
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  );
  const [titleResolved, setTitleResolved] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const renameCancelledRef = useRef(false);

  const handleTitleUpdate = useCallback(
    (title: string) => {
      setConversationTitle(title);
      void queryClient.invalidateQueries({
        queryKey: ['chat-conversations'],
      });
    },
    [queryClient],
  );

  const handleRename = useCallback(async () => {
    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      return;
    }
    if (!conversationId || !renameValue.trim()) {
      setIsRenaming(false);
      return;
    }
    renameCancelledRef.current = true;
    const title = renameValue.trim();
    // Optimistic: reflect the new title in the header and the sidebar list
    // immediately, then reconcile with the server in the background.
    setConversationTitle(title);
    chatConversationsCache.patchTitle({ queryClient, conversationId, title });
    setIsRenaming(false);
    try {
      await chatApi.updateConversation(conversationId, { title });
    } catch {
      toast.error(t('Failed to rename conversation'));
    } finally {
      renameCancelledRef.current = false;
      chatConversationsCache.invalidate({ queryClient });
    }
  }, [conversationId, renameValue, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!conversationId) return;
    await chatApi.deleteConversation(conversationId);
    toast(t('Chat deleted.'), {
      icon: <CircleCheck className="size-4" />,
    });
    chatConversationsCache.invalidate({ queryClient });
    onNewChat();
  }, [conversationId, queryClient, onNewChat]);

  useEffect(() => {
    if (!conversationId || conversationTitle) return;
    let cancelled = false;
    chatApi
      .getConversation(conversationId)
      .then((conv) => {
        if (cancelled) return;
        if (conv.title) setConversationTitle(conv.title);
        setTitleResolved(true);
      })
      .catch(() => {
        if (!cancelled) setTitleResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, conversationTitle]);

  // The shared list cache wins so a rename made from the sidebar shows here
  // instantly; local state covers freshly streamed titles the list doesn't
  // have yet.
  const listTitle = conversationId
    ? conversationsPage?.data.find((c) => c.id === conversationId)?.title ??
      null
    : null;
  const cachedTitle = listTitle ?? conversationTitle;
  const isTitleLoading = !!conversationId && !cachedTitle && !titleResolved;
  const displayTitle = cachedTitle
    ? chatUtils.sanitizeTitle(cachedTitle)
    : t('New Chat');

  const titleContent = (
    <div className="flex min-w-0 items-center">
      {isRenaming ? (
        <Input
          autoFocus
          dir="auto"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onFocus={(e) => {
            const input = e.currentTarget;
            input.select();
            // Focusing scrolls the field to the caret at the text's end;
            // snap back so the title reads from its (direction-aware) start.
            requestAnimationFrame(() => {
              input.scrollLeft = 0;
            });
          }}
          onBlur={() => void handleRename()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleRename();
            if (e.key === 'Escape') {
              renameCancelledRef.current = true;
              setIsRenaming(false);
            }
          }}
          className="h-7 max-w-[300px] border border-foreground text-sm font-semibold"
        />
      ) : (
        <>
          {isTitleLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : conversationId ? (
            <button
              type="button"
              className="min-w-0 rounded-md px-2 py-1 transition-colors hover:bg-gray-300/30 hover:text-accent-foreground dark:hover:bg-gray-300/10"
              onClick={() => {
                setRenameValue(
                  cachedTitle ? chatUtils.sanitizeTitle(cachedTitle) : '',
                );
                setIsRenaming(true);
              }}
            >
              <TypewriterText
                text={displayTitle}
                className="block text-sm font-semibold truncate max-w-[400px]"
              />
            </button>
          ) : (
            <span className="min-w-0 rounded-md px-2 py-1">
              <TypewriterText
                text={displayTitle}
                className="block text-sm font-semibold truncate max-w-[400px]"
              />
            </span>
          )}
          {conversationId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                >
                  <Ellipsis className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    setRenameValue(
                      cachedTitle ? chatUtils.sanitizeTitle(cachedTitle) : '',
                    );
                    setIsRenaming(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('Rename')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <PageHeader
          title={titleContent}
          showSidebarToggle={true}
          rightContent={
            onLayoutModeChange && (
              <ChatLayoutToggle
                mode={layoutMode}
                onModeChange={onLayoutModeChange}
              />
            )
          }
          className="min-w-full h-12 shrink-0 border-b px-2 py-0"
        />
        <ConfirmationDeleteDialog
          title={t('Delete chat')}
          message={t('Are you sure you want to delete this chat?')}
          entityName="chat"
          buttonText={t('Delete')}
          mutationFn={handleDelete}
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onError={() => toast.error(t('Failed to delete conversation'))}
        />
        <div className="flex-1 min-h-0">
          <AIChatBox
            incognito={false}
            conversationId={conversationId}
            onTitleUpdate={handleTitleUpdate}
            onConversationCreated={onConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
