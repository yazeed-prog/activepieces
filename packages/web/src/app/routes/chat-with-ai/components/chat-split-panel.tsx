import { isNil } from '@activepieces/core-utils';
import { ComponentType, LazyExoticComponent, Suspense } from 'react';

import { ProjectDashboardPageHeader } from '@/app/components/project-layout/project-dashboard-page-header';
import { RouteLoadingBar } from '@/components/custom/route-loading-bar';
import {
  chatSplitPage,
  ChatSplitSection,
} from '@/features/chat/lib/chat-split-page';
import { authenticationSession } from '@/lib/authentication-session';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

export function ChatSplitPanel() {
  const projectId = authenticationSession.getProjectId();

  if (isNil(projectId)) {
    return null;
  }

  const section = chatSplitPage.getLastSection();
  const Page = SECTION_PAGES[section];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <ProjectDashboardPageHeader
        pathnameOverride={`/projects/${projectId}/${section}`}
        showSidebarToggle={false}
      />
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<RouteLoadingBar />}>
          <Page />
        </Suspense>
      </div>
    </div>
  );
}

const AutomationsPage = lazyWithRetry(
  () =>
    import('@/app/routes/automations').then((m) => ({
      default: m.AutomationsPage,
    })),
  'chat-split-automations',
);
const RunsPage = lazyWithRetry(
  () => import('@/app/routes/runs').then((m) => ({ default: m.RunsPage })),
  'chat-split-runs',
);
const AppConnectionsPage = lazyWithRetry(
  () =>
    import('@/app/routes/connections').then((m) => ({
      default: m.AppConnectionsPage,
    })),
  'chat-split-connections',
);
const VariablesPage = lazyWithRetry(
  () =>
    import('@/app/routes/variables').then((m) => ({
      default: m.VariablesPage,
    })),
  'chat-split-variables',
);
const ProjectReleasesPage = lazyWithRetry(
  () =>
    import('@/app/routes/project-release').then((m) => ({
      default: m.ProjectReleasesPage,
    })),
  'chat-split-releases',
);

const SECTION_PAGES: Record<
  ChatSplitSection,
  LazyExoticComponent<ComponentType>
> = {
  automations: AutomationsPage,
  runs: RunsPage,
  connections: AppConnectionsPage,
  variables: VariablesPage,
  releases: ProjectReleasesPage,
};
