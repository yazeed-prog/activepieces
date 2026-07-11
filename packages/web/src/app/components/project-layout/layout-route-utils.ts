import { matchPath } from 'react-router-dom';

function shouldHideLayoutHeader(pathname: string): boolean {
  return HEADERLESS_ROUTE_PATTERNS.some(
    (pattern) => matchPath(pattern, pathname) !== null,
  );
}

export const layoutRouteUtils = { shouldHideLayoutHeader };

// Routes that render their own header (builder, run detail, table editor,
// template details) or are header-less by design (chat, impact, platform).
// Project pages always render at the /projects/:projectId/... prefix — the
// bare-path variants only redirect, so they never reach the layout header.
const HEADERLESS_ROUTE_PATTERNS = [
  '/projects/:projectId/flows/:flowId',
  '/projects/:projectId/runs/:runId',
  '/projects/:projectId/tables/:tableId',
  '/templates',
  '/templates/:templateId',
  '/impact',
  '/chat',
  '/chat/*',
  '/platform/*',
];
