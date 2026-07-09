import { isNil, Permission } from '@activepieces/core-utils';
import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { CircleCheck, Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PanelImperativeHandle, PanelSize } from 'react-resizable-panels';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { chatApi } from '@/features/chat/lib/chat-api';
import {
  chatConversationsCache,
  useChatConversations,
} from '@/features/chat/lib/chat-conversations';
import { chatSplitPage } from '@/features/chat/lib/chat-split-page';
import { chatUtils } from '@/features/chat/lib/chat-utils';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { cn } from '@/lib/utils';

import { AIChatBox } from './ai-chat-box';
import {
  ChatLayoutToggle,
  ChatLayoutMode,
} from './components/chat-layout-toggle';
import { ChatSplitPanel } from './components/chat-split-panel';
import { TypewriterText } from './components/typewriter-text';

export function ChatWithAIPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { conversationId: urlConversationId } = useParams<{
    conversationId: string;
  }>();
  const [resetKey, setResetKey] = useState(0);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);
  const { checkAccess } = useAuthorization();
  const canViewAutomations = checkAccess(Permission.READ_FLOW);
  // Split by default only when the user came to the chat from another
  // dashboard page (so the panel has something meaningful to show); a direct
  // first visit opens fullscreen.
  const [layoutMode, setLayoutMode] = useState<ChatLayoutMode>(() =>
    chatSplitPage.hasLastSection() ? 'split' : 'fullscreen',
  );
  // Keeps the split panel in the DOM while its closing width animation plays,
  // so it slides out instead of vanishing the moment the mode flips.
  const [splitPanelMounted, setSplitPanelMounted] = useState(
    () => chatSplitPage.hasLastSection() && canViewAutomations,
  );
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const isDraggingHandleRef = useRef(false);
  const chatPanelRef = useRef<PanelImperativeHandle>(null);
  const splitPanelRef = useRef<PanelImperativeHandle>(null);
  const [initialChatPercentage] = useState(() =>
    chatSplitPage.hasLastSection() && canViewAutomations
      ? chatSplitRatio.load()
      : 100,
  );

  const handleLayoutModeChange = useCallback((mode: ChatLayoutMode) => {
    setLayoutMode(mode);
    if (mode === 'split') {
      setSplitPanelMounted(true);
      resizeSplitPanel({
        handle: splitPanelRef.current,
        size: `${100 - chatSplitRatio.load()}%`,
      });
    } else {
      resizeSplitPanel({ handle: splitPanelRef.current, size: '0%' });
    }
  }, []);

  const startDraggingHandle = useCallback(() => {
    isDraggingHandleRef.current = true;
    setIsDraggingHandle(true);
  }, []);

  // The resize handle keeps pointer capture, so drag end is observed globally;
  // this is also where the user's chosen ratio is persisted.
  useEffect(() => {
    const handlePointerUp = () => {
      if (!isDraggingHandleRef.current) return;
      isDraggingHandleRef.current = false;
      setIsDraggingHandle(false);
      const percentage = chatPanelRef.current?.getSize().asPercentage;
      if (
        !isNil(percentage) &&
        percentage > CLOSE_SNAP_PERCENTAGE &&
        percentage < FULLSCREEN_SNAP_PERCENTAGE
      ) {
        chatSplitRatio.save(percentage);
      }
    };
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  const handleChatPanelResize = useCallback(
    (size: PanelSize) => {
      if (!isDraggingHandleRef.current) return;
      if (size.asPercentage >= FULLSCREEN_SNAP_PERCENTAGE) {
        isDraggingHandleRef.current = false;
        setIsDraggingHandle(false);
        setLayoutMode('fullscreen');
        resizeSplitPanel({ handle: splitPanelRef.current, size: '0%' });
        return;
      }
      if (size.asPercentage <= CLOSE_SNAP_PERCENTAGE) {
        isDraggingHandleRef.current = false;
        const projectId = authenticationSession.getProjectId();
        if (isNil(projectId)) return;
        // Closing the chat is safe mid-run: the turn executes server-side and
        // the client reattaches to the live stream when the chat is reopened.
        navigate(`/projects/${projectId}/${chatSplitPage.getLastSection()}`);
      }
    },
    [navigate],
  );

  useEffect(() => {
    // Record the chat-page landing for the cloud rollout funnel (server is cloud-gated; no-op otherwise).
    chatApi.recordLanding().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = useCallback(() => {
    setResetKey((k) => k + 1);
    setPendingConversationId(null);
    navigate('/chat', { replace: true });
  }, [navigate]);

  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      setPendingConversationId(conversationId);
      navigate(`/chat/${conversationId}`, { replace: true });
      void queryClient.invalidateQueries({
        queryKey: ['chat-conversations'],
      });
    },
    [navigate, queryClient],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'o'
      ) {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNewChat]);

  useEffect(() => {
    const handler = () => handleNewChat();
    window.addEventListener(chatUtils.newChatEvent, handler);
    return () => window.removeEventListener(chatUtils.newChatEvent, handler);
  }, [handleNewChat]);

  // The key stays stable while the conversation this session just created gets
  // its id (so the first streamed reply isn't killed by a remount), and changes
  // when the user opens a different conversation (clean remount + history load).
  const chatKey =
    urlConversationId && urlConversationId !== pendingConversationId
      ? urlConversationId
      : `session-${resetKey}`;

  const isSplit = layoutMode === 'split' && canViewAutomations;
  const panelAnimationStyle = {
    transitionDuration: isDraggingHandle
      ? '0ms'
      : `${LAYOUT_ANIMATION_DURATION_MS}ms`,
  };

  return (
    <ResizablePanelGroup orientation="horizontal" className="overflow-hidden">
      <ResizablePanel
        id="chat"
        panelRef={chatPanelRef}
        defaultSize={`${initialChatPercentage}%`}
        onResize={handleChatPanelResize}
        className={cn(
          'min-w-0',
          !isDraggingHandle && 'transition-all ease-in-out',
        )}
        style={panelAnimationStyle}
      >
        <ChatSession
          key={chatKey}
          conversationId={urlConversationId ?? null}
          onNewChat={handleNewChat}
          onConversationCreated={handleConversationCreated}
          layoutMode={layoutMode}
          onLayoutModeChange={
            canViewAutomations ? handleLayoutModeChange : undefined
          }
        />
      </ResizablePanel>
      <ResizableHandle
        disabled={!isSplit}
        onPointerDown={startDraggingHandle}
        className={cn(!isSplit && 'bg-transparent')}
      />
      <ResizablePanel
        id="split-page"
        panelRef={splitPanelRef}
        collapsedSize="0%"
        defaultSize={`${100 - initialChatPercentage}%`}
        minSize="0%"
        maxSize={isSplit ? '100%' : '0%'}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && !isSplit) {
            setSplitPanelMounted(false);
          }
        }}
        className={cn(
          'min-w-0 overflow-hidden',
          splitPanelMounted && 'border-l',
          !isDraggingHandle && 'transition-all ease-in-out',
        )}
        style={panelAnimationStyle}
      >
        {splitPanelMounted && <ChatSplitPanel />}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function ChatSession({
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

function resizeSplitPanel({
  handle,
  size,
}: {
  handle: PanelImperativeHandle | null;
  size: string;
}): void {
  if (!handle) return;
  handle.resize(size);
  // The panel's size constraints flip in the same commit as the mode change;
  // re-applying on the next frame ensures the resize isn't clamped by the
  // outgoing constraints (same pattern as the builder's right sidebar).
  requestAnimationFrame(() => handle.resize(size));
}

const chatSplitRatio = {
  load(): number {
    const stored = Number(localStorage.getItem(CHAT_SPLIT_RATIO_KEY));
    return stored > CLOSE_SNAP_PERCENTAGE && stored < FULLSCREEN_SNAP_PERCENTAGE
      ? stored
      : DEFAULT_CHAT_PERCENTAGE;
  },
  save(percentage: number): void {
    localStorage.setItem(CHAT_SPLIT_RATIO_KEY, String(Math.round(percentage)));
  },
};

const CHAT_SPLIT_RATIO_KEY = 'ap-chat-split-ratio';
const DEFAULT_CHAT_PERCENTAGE = 50;
const FULLSCREEN_SNAP_PERCENTAGE = 80;
const CLOSE_SNAP_PERCENTAGE = 20;
const LAYOUT_ANIMATION_DURATION_MS = 500;
