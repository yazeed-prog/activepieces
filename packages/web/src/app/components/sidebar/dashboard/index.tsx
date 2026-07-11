import { isNil, Permission } from '@activepieces/core-utils';
import { TemplateTelemetryEventType } from '@activepieces/shared';
import { t } from 'i18next';
import { Play, Plus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BoxIcon } from '@/components/icons/box';
import { ChartLineIcon } from '@/components/icons/chart-line';
import { CompassIcon } from '@/components/icons/compass';
import { FileJson2Icon } from '@/components/icons/file-json2';
import { ShieldIcon } from '@/components/icons/shield';
import { UnplugIcon } from '@/components/icons/unplug';
import { WorkflowIcon } from '@/components/icons/workflow';
import { useEmbedding } from '@/components/providers/embed-provider';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar-shadcn';
import { chatRouteUtils } from '@/features/chat/lib/chat-routes';
import { chatUtils } from '@/features/chat/lib/chat-utils';
import { useChatDockStore } from '@/features/chat/stores/chat-dock-state';
import { projectCollectionUtils } from '@/features/projects';
import { templatesTelemetryApi } from '@/features/templates';
import {
  useAuthorization,
  useIsPlatformAdmin,
} from '@/hooks/authorization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';

import { recordAccess } from '../../global-search/access-history';
import { GlobalSearchCommand } from '../../global-search/global-search-command';
import { STATIC_PAGES } from '../../global-search/static-pages';
import { ApSidebarItem, SidebarItemType } from '../ap-sidebar-item';
import { AppSidebarHeader } from '../sidebar-header';
import SidebarUsageLimits from '../sidebar-usage-limits';
import { SidebarUser } from '../sidebar-user';

import { SidebarConversations } from './sidebar-conversations';

export function ProjectDashboardSidebar({
  className,
  collapsible = 'icon',
}: { className?: string; collapsible?: 'icon' | 'offcanvas' } = {}) {
  const { embedState } = useEmbedding();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentUser } = userHooks.useCurrentUser();
  const { platform } = platformHooks.useCurrentPlatform();
  const { checkAccess } = useAuthorization();
  const { project } = projectCollectionUtils.useCurrentProject();

  const handleExploreClick = useCallback(() => {
    templatesTelemetryApi.sendEvent({
      eventType: TemplateTelemetryEventType.EXPLORE_VIEW,
      userId: currentUser?.id,
    });
  }, [currentUser?.id]);

  const handleNewChat = useCallback(() => {
    window.dispatchEvent(new Event(chatUtils.newChatEvent));
    // From a regular page the chat docks in place (split view, URL stays the
    // page's); only on chat routes / embedded does it navigate.
    if (
      !chatRouteUtils.isChatRoute(location.pathname) &&
      !embedState.isEmbedded
    ) {
      useChatDockStore.getState().requestNewChat();
      return;
    }
    navigate('/chat');
  }, [location.pathname, embedState.isEmbedded, navigate]);

  const exploreLink: SidebarItemType = {
    type: 'link',
    to: '/templates',
    label: t('Explore'),
    show: true,
    icon: CompassIcon,
    hasPermission: true,
    isSubItem: false,
    onClick: () => {
      handleExploreClick();
      const page = STATIC_PAGES.find((p) => p.href === '/templates');
      if (page)
        recordAccess({
          id: page.id,
          type: 'page',
          label: page.label,
          href: page.href,
        });
    },
  };

  const impactLink: SidebarItemType = {
    type: 'link',
    to: '/impact',
    label: t('Impact'),
    icon: ChartLineIcon,
    show: true,
    hasPermission: true,
    isSubItem: false,
    onClick: () => {
      const page = STATIC_PAGES.find((p) => p.href === '/impact');
      if (page)
        recordAccess({
          id: page.id,
          type: 'page',
          label: page.label,
          href: page.href,
        });
    },
  };

  const automationsLink: SidebarItemType = {
    type: 'link',
    to: authenticationSession.appendProjectRoutePrefix('/automations'),
    label: t('Automations'),
    icon: WorkflowIcon,
    show: true,
    hasPermission: checkAccess(Permission.READ_FLOW),
    isSubItem: false,
    isActive: (pathname) =>
      ['/automations', '/flows', '/tables'].some((section) =>
        pathname.includes(section),
      ),
  };

  const runsLink: SidebarItemType = {
    type: 'link',
    to: authenticationSession.appendProjectRoutePrefix('/runs'),
    label: t('Runs'),
    icon: Play,
    show: true,
    hasPermission: checkAccess(Permission.READ_RUN),
    isSubItem: false,
  };

  const connectionsLink: SidebarItemType = {
    type: 'link',
    to: authenticationSession.appendProjectRoutePrefix('/connections'),
    label: t('Connections'),
    icon: UnplugIcon,
    show: true,
    hasPermission: checkAccess(Permission.READ_APP_CONNECTION),
    isSubItem: false,
  };

  const variablesLink: SidebarItemType = {
    type: 'link',
    to: authenticationSession.appendProjectRoutePrefix('/variables'),
    label: t('Variables'),
    icon: FileJson2Icon,
    show: true,
    hasPermission: checkAccess(Permission.READ_VARIABLE),
    isSubItem: false,
  };

  const releasesLink: SidebarItemType = {
    type: 'link',
    to: authenticationSession.appendProjectRoutePrefix('/releases'),
    label: t('Releases'),
    icon: BoxIcon,
    show: project.releasesEnabled,
    hasPermission:
      project.releasesEnabled &&
      checkAccess(Permission.READ_PROJECT_RELEASE) &&
      !embedState.isEmbedded,
    isSubItem: false,
  };

  const generalItems = [exploreLink, impactLink]
    .filter((item) => item.show !== false)
    .filter((item) => isNil(item.hasPermission) || item.hasPermission);

  const projectItems = [
    automationsLink,
    runsLink,
    connectionsLink,
    variablesLink,
    releasesLink,
  ]
    .filter((item) => item.show !== false)
    .filter((item) => isNil(item.hasPermission) || item.hasPermission);

  const chatEnabled = platform.plan.chatEnabled;

  return (
    !embedState.hideSideNav && (
      <Sidebar
        collapsible={collapsible}
        id={SIDEBAR_ID}
        className={className}
        resizable
      >
        <AppSidebarHeader />

        <div className="relative z-10 shrink-0 bg-sidebar px-2 pt-2 pb-1 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-1.5 after:bg-gradient-to-b after:from-sidebar after:to-transparent">
          <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:justify-center">
            {chatEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-0 flex-1 justify-start gap-2 px-2 font-medium group-data-[collapsible=icon]:hidden"
                onClick={handleNewChat}
              >
                <Plus className="size-4 shrink-0" />
                <span className="truncate text-xs">{t('New Chat')}</span>
              </Button>
            )}
            <GlobalSearchCommand
              variant={chatEnabled ? 'compact' : 'default'}
            />
          </div>
        </div>

        <SidebarContent className="overflow-y-auto overflow-x-hidden">
          <SidebarGroup className="shrink-0 pt-1">
            <SidebarMenu>
              {generalItems.map((item) => (
                <ApSidebarItem key={item.label} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup className="mt-4 shrink-0 pt-0">
            <SidebarMenu>
              {projectItems.map((item) => (
                <ApSidebarItem key={item.label} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarConversations />
        </SidebarContent>
        <SidebarFooter className="border-t">
          {state === 'expanded' && <DelayedSidebarUsageLimits />}
          <SidebarPlatformAdminLink />
          <SidebarUser />
        </SidebarFooter>
      </Sidebar>
    )
  );
}

function DelayedSidebarUsageLimits() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return show ? (
    <div>
      <SidebarUsageLimits />
    </div>
  ) : null;
}

function SidebarPlatformAdminLink() {
  const showPlatformAdmin = useIsPlatformAdmin();
  const { embedState } = useEmbedding();

  if (embedState.isEmbedded || !showPlatformAdmin) {
    return null;
  }

  return (
    <SidebarMenu>
      <ApSidebarItem
        type="link"
        to="/platform/projects"
        label={t('Platform Admin')}
        icon={ShieldIcon}
        isSubItem={false}
        show={true}
        hasPermission={true}
        onClick={() => {
          const page = STATIC_PAGES.find(
            (p) =>
              p.href === '/platform/projects' && p.id === 'page-platform-admin',
          );
          if (page)
            recordAccess({
              id: page.id,
              type: 'page',
              label: page.label,
              href: page.href,
            });
        }}
      />
    </SidebarMenu>
  );
}

export const SIDEBAR_ID = 'project-sidebar';
