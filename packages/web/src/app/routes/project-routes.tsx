import { Permission } from '@activepieces/core-utils';
import React, { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { PageTitle } from '@/app/components/page-title';
import { RouteLoadingBar } from '@/components/custom/route-loading-bar';
import { useEmbedding } from '@/components/providers/embed-provider';
import { ApTableStateProvider } from '@/features/tables';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { routesThatRequireProjectId } from '@/lib/route-utils';

import { AllowOnlyLoggedInUserOnlyGuard } from '../components/allow-logged-in-user-only-guard';
import { ProjectDashboardLayout } from '../components/project-layout';
import { AfterImportFlowRedirect } from '../guards/after-import-flow-redirect';
import { RoutePermissionGuard } from '../guards/permission-guard';
import {
  ProjectDashboardRouterWrapper,
  ProjectRouterWrapper,
} from '../guards/project-route-wrapper';

import { AutomationsPage } from './automations';
const FlowBuilderPage = lazyWithRetry(
  () => import('./flows/id').then((m) => ({ default: m.FlowBuilderPage })),
  'flow-builder',
);
const AnalyticsPage = lazyWithRetry(() => import('./impact'), 'analytics');
const ProjectReleasesPage = lazyWithRetry(
  () =>
    import('./project-release').then((m) => ({
      default: m.ProjectReleasesPage,
    })),
  'project-releases',
);
const ViewRelease = lazyWithRetry(
  () => import('./project-release/view-release'),
  'view-release',
);
const RunsPage = lazyWithRetry(
  () => import('./runs').then((m) => ({ default: m.RunsPage })),
  'runs',
);
const FlowRunPage = lazyWithRetry(
  () => import('./runs/id').then((m) => ({ default: m.FlowRunPage })),
  'flow-run',
);
const AppConnectionsPage = lazyWithRetry(
  () =>
    import('./connections').then((m) => ({ default: m.AppConnectionsPage })),
  'connections',
);
const VariablesPage = lazyWithRetry(
  () => import('./variables').then((m) => ({ default: m.VariablesPage })),
  'variables',
);
const ApTableEditorPage = lazyWithRetry(
  () => import('./tables/id').then((m) => ({ default: m.ApTableEditorPage })),
  'table-editor',
);

const SettingsRerouter = () => {
  const { hash } = useLocation();
  const fragmentWithoutHash = hash.slice(1).toLowerCase();
  return fragmentWithoutHash ? (
    <Navigate to={`/settings/${fragmentWithoutHash}`} replace />
  ) : (
    <Navigate to="/settings/team" replace />
  );
};

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoadingBar />}>{children}</Suspense>;
}

function HideTablesGuard({ children }: { children: React.ReactNode }) {
  const { embedState } = useEmbedding();
  if (embedState.hideTables) {
    return <Navigate to={routesThatRequireProjectId.automations} replace />;
  }
  return <>{children}</>;
}

const automationsPagePermissions = [
  Permission.READ_FLOW,
  Permission.READ_TABLE,
  Permission.READ_FOLDER,
];

export const projectRoutes = [
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.automations,
    element: (
      <RoutePermissionGuard requiredPermissions={automationsPagePermissions}>
        <PageTitle title="Flows">
          <SuspenseWrapper>
            <AutomationsPage />
          </SuspenseWrapper>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.flows,
    element: <Navigate to={routesThatRequireProjectId.automations} replace />,
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.singleFlow,
    element: (
      <RoutePermissionGuard requiredPermissions={Permission.READ_FLOW}>
        <PageTitle title="Builder">
          <SuspenseWrapper>
            <FlowBuilderPage />
          </SuspenseWrapper>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectRouterWrapper({
    path: '/flow-import-redirect/:flowId',
    element: <AfterImportFlowRedirect></AfterImportFlowRedirect>,
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.singleRun,
    element: (
      <RoutePermissionGuard requiredPermissions={Permission.READ_RUN}>
        <PageTitle title="Flow Run">
          <SuspenseWrapper>
            <FlowRunPage />
          </SuspenseWrapper>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.runs,
    element: (
      <RoutePermissionGuard requiredPermissions={Permission.READ_RUN}>
        <PageTitle title="Runs">
          <SuspenseWrapper>
            <RunsPage />
          </SuspenseWrapper>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.singleRelease,
    element: (
      <PageTitle title="Releases">
        <SuspenseWrapper>
          <ViewRelease />
        </SuspenseWrapper>
      </PageTitle>
    ),
  }),
  ...ProjectRouterWrapper({
    path: routesThatRequireProjectId.tables,
    element: <Navigate to={routesThatRequireProjectId.automations} replace />,
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.singleTable,
    element: (
      <HideTablesGuard>
        <RoutePermissionGuard requiredPermissions={Permission.READ_TABLE}>
          <PageTitle title="Table">
            <ApTableStateProvider>
              <SuspenseWrapper>
                <ApTableEditorPage />
              </SuspenseWrapper>
            </ApTableStateProvider>
          </PageTitle>
        </RoutePermissionGuard>
      </HideTablesGuard>
    ),
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.connections,
    element: (
      <RoutePermissionGuard
        requiredPermissions={Permission.READ_APP_CONNECTION}
      >
        <PageTitle title="Connections">
          <SuspenseWrapper>
            <AppConnectionsPage />
          </SuspenseWrapper>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.variables,
    element: (
      <RoutePermissionGuard requiredPermissions={Permission.READ_VARIABLE}>
        <PageTitle title="Variables">
          <SuspenseWrapper>
            <VariablesPage />
          </SuspenseWrapper>
        </PageTitle>
      </RoutePermissionGuard>
    ),
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.releases,
    element: (
      <PageTitle title="Releases">
        <SuspenseWrapper>
          <ProjectReleasesPage />
        </SuspenseWrapper>
      </PageTitle>
    ),
  }),
  ...ProjectDashboardRouterWrapper({
    path: routesThatRequireProjectId.settings,
    element: <SettingsRerouter></SettingsRerouter>,
  }),
  {
    path: '/impact',
    element: (
      <AllowOnlyLoggedInUserOnlyGuard>
        <ProjectDashboardLayout>
          <PageTitle title="Impact">
            <SuspenseWrapper>
              <AnalyticsPage />
            </SuspenseWrapper>
          </PageTitle>
        </ProjectDashboardLayout>
      </AllowOnlyLoggedInUserOnlyGuard>
    ),
  },
];
