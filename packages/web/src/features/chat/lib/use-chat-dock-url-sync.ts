import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { useEmbedding } from '@/components/providers/embed-provider';
import { platformHooks } from '@/hooks/platform-hooks';

import { useChatDockStore } from '../stores/chat-dock-state';

import { chatDockUrl } from './chat-dock-url';
import { chatRouteUtils } from './chat-routes';

// Mirrors the chat dock state into a `?chat=` query param so a docked split
// view survives refresh and can be shared as a link. The dock store stays the
// runtime source of truth: the URL is read once on mount to hydrate the store,
// then written to whenever the dock state changes (or a navigation drops the
// param).
export function useChatDockUrlSync() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { embedState } = useEmbedding();
  const { platform } = platformHooks.useCurrentPlatform();

  const enabled =
    !chatRouteUtils.isChatRoute(location.pathname) &&
    !embedState.isEmbedded &&
    platform.plan.chatEnabled;

  // Hydration runs synchronously in a lazy initializer (not an effect), before
  // any `docked` selector below or in the calling layout, so the very first
  // render already sees `docked=true` and opens the panel at the saved split
  // ratio instead of animating it in after mount. Safe: no store subscriber
  // has mounted yet, and re-running under StrictMode is idempotent.
  useState(() => {
    if (!enabled) {
      return null;
    }
    const fromUrl = chatDockUrl.read({ searchParams });
    if (fromUrl) {
      useChatDockStore
        .getState()
        .openDock({ conversationId: fromUrl.conversationId });
    }
    return null;
  });

  const docked = useChatDockStore((state) => state.docked);
  const dockedConversationId = useChatDockStore(
    (state) => state.dockedConversationId,
  );

  // The `searchParams` dep is what re-adds the param after sidebar navigations
  // drop it. `write` returns null when the URL already matches, which breaks
  // the replace loop `setSearchParams` would otherwise cause.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const next = chatDockUrl.write({
      searchParams,
      docked,
      dockedConversationId,
    });
    if (next) {
      setSearchParams(next, { replace: true });
    }
  }, [enabled, docked, dockedConversationId, searchParams, setSearchParams]);
}
