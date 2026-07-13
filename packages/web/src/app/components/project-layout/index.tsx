import { isNil } from '@activepieces/core-utils';
import { ApEdition, ApFlagId } from '@activepieces/shared';
import React, {
  ComponentType,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';
import { PanelImperativeHandle, PanelSize } from 'react-resizable-panels';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useCursorTooltip } from '@/components/custom/cursor-tooltip';
import { useEmbedding } from '@/components/providers/embed-provider';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable-panel';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar-shadcn';
import { PurchaseExtraFlowsDialog } from '@/features/billing';
import { chatRouteUtils } from '@/features/chat/lib/chat-routes';
import { chatSplitPage } from '@/features/chat/lib/chat-split-page';
import { useChatDockUrlSync } from '@/features/chat/lib/use-chat-dock-url-sync';
import { useChatDockStore } from '@/features/chat/stores/chat-dock-state';
import { projectHooks } from '@/features/projects';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { cn } from '@/lib/utils';

import { authenticationSession } from '../../../lib/authentication-session';
import { GlobalSearchProvider } from '../global-search/global-search-context';
import { ProjectDashboardSidebar } from '../sidebar/dashboard';

import { layoutRouteUtils } from './layout-route-utils';
import { ProjectDashboardLayoutHeader } from './project-dashboard-layout-header';
import { ProjectDashboardPageHeader } from './project-dashboard-page-header';

const ChatDockHost = lazyWithRetry(
  () =>
    import('@/app/routes/chat-with-ai/chat-dock-host').then((m) => ({
      default: m.ChatDockHost,
    })),
  'chat-dock-host',
);

export type ProjectDashboardLayoutHeaderTab = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  hasPermission: boolean;
  show: boolean;
  beta?: boolean;
};

const ProjectChangedRedirector = ({
  currentProjectId,
  children,
}: {
  currentProjectId: string;
  children: React.ReactNode;
}) => {
  projectHooks.useReloadPageIfProjectIdChanged(currentProjectId);
  return children;
};

export function ProjectDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  // Subscribed to the 'storage' event: the token checker now runs BELOW this
  // layout, so a cross-project deep link switches the project mid-render and
  // the layout must self-correct instead of keeping the stale project.
  const currentProjectId = useSyncExternalStore(subscribeToStorageEvent, () =>
    authenticationSession.getProjectId(),
  );
  const location = useLocation();
  const isEmbedded = useEmbedding().embedState.isEmbedded;

  // Remembered so the chat split-screen can reopen the page the user was on
  // before going fullscreen.
  useEffect(() => {
    chatSplitPage.recordVisit({ pathname: location.pathname });
  }, [location.pathname]);

  if (isNil(currentProjectId) || currentProjectId === '') {
    return <Navigate to="/sign-in" replace />;
  }

  const hideHeader = layoutRouteUtils.shouldHideLayoutHeader(location.pathname);

  return (
    <ProjectChangedRedirector currentProjectId={currentProjectId}>
      <GlobalSearchProvider>
        <ProjectDashboardLayoutInner
          hideHeader={hideHeader}
          isEmbedded={isEmbedded}
          currentProjectId={currentProjectId}
        >
          {children}
        </ProjectDashboardLayoutInner>
        {edition === ApEdition.CLOUD && <PurchaseExtraFlowsDialog />}
      </GlobalSearchProvider>
    </ProjectChangedRedirector>
  );
}

function ProjectDashboardLayoutInner({
  hideHeader,
  isEmbedded,
  currentProjectId,
  children,
}: {
  hideHeader: boolean;
  isEmbedded: boolean;
  currentProjectId: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { platform } = platformHooks.useCurrentPlatform();
  // Must run before the `docked` read below: it hydrates the store from the
  // `?chat=` param synchronously so the first render restores the split view.
  useChatDockUrlSync();
  const docked = useChatDockStore((state) => state.docked);
  const onChatRoute = chatRouteUtils.isChatRoute(location.pathname);
  const dockAllowed = docked && platform.plan.chatEnabled && !isEmbedded;
  // On chat routes the host renders unconditionally (the route child is empty,
  // so gating it on chatEnabled would blank direct /chat visits).
  const chatVisible = onChatRoute || dockAllowed;
  const isSplit = dockAllowed && !onChatRoute;

  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const isDraggingHandleRef = useRef(false);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const chatPanelRef = useRef<PanelImperativeHandle>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const dashboardContentRef = useRef<HTMLDivElement>(null);
  const [initialChatPercentage] = useState(() =>
    onChatRoute ? 100 : isSplit ? chatSplitRatio.load() : 0,
  );
  // Keeps the chat in the DOM while its closing width animation plays, so it
  // slides out instead of vanishing the moment the dock closes.
  const [chatMounted, setChatMounted] = useState(chatVisible);

  useEffect(() => {
    if (chatVisible) {
      setChatMounted(true);
    }
  }, [chatVisible]);

  const chatMode = onChatRoute ? 'fullscreen' : isSplit ? 'split' : 'closed';
  useEffect(() => {
    const percentage =
      chatMode === 'fullscreen'
        ? 100
        : chatMode === 'split'
        ? chatSplitRatio.load()
        : 0;
    resizeChatPanel({
      handle: chatPanelRef.current,
      size: `${percentage}%`,
    });
  }, [chatMode]);

  const startDraggingHandle = useCallback((event: React.PointerEvent) => {
    dragStartPointRef.current = { x: event.clientX, y: event.clientY };
    isDraggingHandleRef.current = true;
    setIsDraggingHandle(true);
  }, []);

  // The resize handle keeps pointer capture, so drag end is observed globally.
  // Crossing a snap threshold only fades the panel's content while dragging;
  // the actual action (close / fullscreen / persist the ratio) is decided
  // here, on release.
  useEffect(() => {
    const handleDragEnd = (event: PointerEvent) => {
      if (!isDraggingHandleRef.current) return;
      isDraggingHandleRef.current = false;
      setIsDraggingHandle(false);
      if (chatContentRef.current) {
        chatContentRef.current.style.opacity = '';
      }
      if (dashboardContentRef.current) {
        dashboardContentRef.current.style.opacity = '';
      }
      const start = dragStartPointRef.current;
      dragStartPointRef.current = null;
      const isClick =
        !isNil(start) &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <
          CLICK_MOVEMENT_TOLERANCE_PX;
      if (isClick) {
        useChatDockStore.getState().closeDock();
        return;
      }
      const percentage = chatPanelRef.current?.getSize().asPercentage;
      if (isNil(percentage)) return;
      if (percentage >= FULLSCREEN_SNAP_PERCENTAGE) {
        const { dockedConversationId, closeDock } = useChatDockStore.getState();
        closeDock();
        navigate(
          dockedConversationId ? `/chat/${dockedConversationId}` : '/chat',
        );
        return;
      }
      if (percentage <= CLOSE_SNAP_PERCENTAGE) {
        // Closing the chat is safe mid-run: the turn executes server-side and
        // the client reattaches to the live stream when the chat is reopened.
        useChatDockStore.getState().closeDock();
        return;
      }
      chatSplitRatio.save(percentage);
    };
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointercancel', handleDragEnd);
    return () => {
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('pointercancel', handleDragEnd);
    };
  }, [navigate]);

  const handleChatPanelResize = useCallback((size: PanelSize) => {
    if (!isDraggingHandleRef.current) return;
    const percentage = size.asPercentage;
    // Written straight to the DOM: onResize fires on every pointer move, so
    // routing this through state would re-render the whole layout per frame.
    if (chatContentRef.current) {
      chatContentRef.current.style.opacity =
        percentage < CLOSE_SNAP_PERCENTAGE
          ? String(percentage / CLOSE_SNAP_PERCENTAGE)
          : '';
    }
    if (dashboardContentRef.current) {
      dashboardContentRef.current.style.opacity =
        percentage > FULLSCREEN_SNAP_PERCENTAGE
          ? String((100 - percentage) / (100 - FULLSCREEN_SNAP_PERCENTAGE))
          : '';
    }
  }, []);

  const panelAnimationStyle = {
    transitionDuration: isDraggingHandle
      ? '0ms'
      : `${LAYOUT_ANIMATION_DURATION_MS}ms`,
  };

  const handleTooltip = useCursorTooltip({
    lines: [
      { action: t('Click'), description: t('to close') },
      { action: t('Drag'), description: t('to resize') },
    ],
    disabled: !isSplit || isDraggingHandle,
  });

  return (
    <SidebarProvider defaultOpen={true} hoverMode={true}>
      {!isEmbedded && <ProjectDashboardSidebar collapsible="offcanvas" />}
      <SidebarInset className="flex flex-col h-full overflow-hidden bg-sidebar">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResizablePanelGroup
            orientation="horizontal"
            className="overflow-hidden"
          >
            <ResizablePanel
              id="chat-dock"
              panelRef={chatPanelRef}
              defaultSize={`${initialChatPercentage}%`}
              collapsedSize="0%"
              minSize="0%"
              maxSize={chatVisible ? '100%' : '0%'}
              onResize={handleChatPanelResize}
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && !chatVisible) {
                  setChatMounted(false);
                }
              }}
              className={cn(
                'min-w-0 overflow-hidden bg-background',
                !isDraggingHandle && 'transition-all ease-in-out',
              )}
              style={panelAnimationStyle}
            >
              <div ref={chatContentRef} className="h-full">
                {chatMounted && (
                  <Suspense fallback={null}>
                    <ChatDockHost key={currentProjectId} />
                  </Suspense>
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle
              disabled={!isSplit}
              onPointerDown={startDraggingHandle}
              // The library's own capture-phase dblclick listener resets the
              // chat panel to its defaultSize; a fast double click must stay
              // two "close" clicks instead.
              onDoubleClickCapture={(e) => e.preventDefault()}
              {...handleTooltip.handlers}
              className={cn(
                'transition-colors duration-200 ease-in-out hover:bg-muted-foreground/40',
                isDraggingHandle && 'bg-muted-foreground/40 duration-0',
                !isSplit && 'bg-transparent hover:bg-transparent',
              )}
            />
            {handleTooltip.tooltip}
            {/* Deliberately unconstrained (no min/max/collapsedSize): the chat
                panel is the controlled one, and constraining this side leaves
                it stuck in a collapsed state that programmatic resizes of the
                chat panel cannot expand. */}
            <ResizablePanel
              id="dashboard-content"
              defaultSize={`${100 - initialChatPercentage}%`}
              className={cn(
                'min-w-0 overflow-hidden',
                !isDraggingHandle && 'transition-all ease-in-out',
              )}
              style={panelAnimationStyle}
            >
              <div
                id="dashboard-content-container"
                ref={dashboardContentRef}
                className="relative flex flex-col h-full bg-background overflow-clip"
              >
                {!hideHeader &&
                  (isEmbedded ? (
                    <ProjectDashboardLayoutHeader key={currentProjectId} />
                  ) : (
                    <ProjectDashboardPageHeader
                      key={currentProjectId}
                      showSidebarToggle={!chatVisible}
                    />
                  ))}
                <div className="flex-1 overflow-auto">{children}</div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function subscribeToStorageEvent(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function resizeChatPanel({
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
const CLICK_MOVEMENT_TOLERANCE_PX = 5;
const DEFAULT_CHAT_PERCENTAGE = 50;
const FULLSCREEN_SNAP_PERCENTAGE = 80;
const CLOSE_SNAP_PERCENTAGE = 20;
const LAYOUT_ANIMATION_DURATION_MS = 500;
