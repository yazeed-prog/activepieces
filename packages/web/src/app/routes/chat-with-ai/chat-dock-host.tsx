import { Permission } from '@activepieces/core-utils';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { chatApi } from '@/features/chat/lib/chat-api';
import { chatRouteUtils } from '@/features/chat/lib/chat-routes';
import { chatSplitPage } from '@/features/chat/lib/chat-split-page';
import { chatUtils } from '@/features/chat/lib/chat-utils';
import { useChatDockStore } from '@/features/chat/stores/chat-dock-state';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { authenticationSession } from '@/lib/authentication-session';

import { ChatSession } from './chat-session';
import { ChatLayoutMode } from './components/chat-layout-toggle';

// Hosts the chat UI inside ProjectDashboardLayout so it stays mounted across
// route navigation. On /chat routes the conversation comes from the URL; while
// docked on a regular page it comes from the dock store and the URL stays the
// page's.
export function ChatDockHost() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const docked = useChatDockStore((state) => state.docked);
  const dockedConversationId = useChatDockStore(
    (state) => state.dockedConversationId,
  );
  const { checkAccess } = useAuthorization();
  const canViewAutomations = checkAccess(Permission.READ_FLOW);
  const onChatRoute = chatRouteUtils.isChatRoute(location.pathname);
  const conversationId = onChatRoute
    ? chatRouteUtils.conversationIdFromPathname(location.pathname)
    : dockedConversationId;
  const [resetKey, setResetKey] = useState(0);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    // Record the chat landing for the cloud rollout funnel (server is
    // cloud-gated; no-op otherwise). The host mounts once per chat visibility,
    // so this keeps today's once-per-visit semantics.
    chatApi.recordLanding().catch(() => undefined);
  }, []);

  const handleNewChat = useCallback(() => {
    setResetKey((k) => k + 1);
    setPendingConversationId(null);
    if (onChatRoute) {
      navigate('/chat', { replace: true });
    } else {
      useChatDockStore.getState().setDockedConversationId(null);
    }
  }, [onChatRoute, navigate]);

  const handleConversationCreated = useCallback(
    (createdConversationId: string) => {
      setPendingConversationId(createdConversationId);
      if (onChatRoute) {
        navigate(`/chat/${createdConversationId}`, { replace: true });
      } else {
        useChatDockStore
          .getState()
          .setDockedConversationId(createdConversationId);
      }
      void queryClient.invalidateQueries({
        queryKey: ['chat-conversations'],
      });
    },
    [onChatRoute, navigate, queryClient],
  );

  const handleLayoutModeChange = useCallback(
    (mode: ChatLayoutMode) => {
      if (mode === 'split') {
        useChatDockStore.getState().openDock({ conversationId });
        navigate(
          authenticationSession.appendProjectRoutePrefix(
            `/${chatSplitPage.getLastSection()}`,
          ),
        );
      } else {
        useChatDockStore.getState().closeDock();
        navigate(conversationId ? `/chat/${conversationId}` : '/chat');
      }
    },
    [conversationId, navigate],
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
    conversationId && conversationId !== pendingConversationId
      ? conversationId
      : `session-${resetKey}`;

  return (
    <ChatSession
      key={chatKey}
      conversationId={conversationId}
      onNewChat={handleNewChat}
      onConversationCreated={handleConversationCreated}
      layoutMode={docked && !onChatRoute ? 'split' : 'fullscreen'}
      onLayoutModeChange={
        canViewAutomations ? handleLayoutModeChange : undefined
      }
    />
  );
}
