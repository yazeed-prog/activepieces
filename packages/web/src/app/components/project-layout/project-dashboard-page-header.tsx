import { isNil, Permission } from '@activepieces/core-utils';
import {
  ApFlagId,
  PlatformRole,
  ProjectType,
  UserStatus,
} from '@activepieces/shared';
import { t } from 'i18next';
import { UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AnimatedIconButton } from '@/components/custom/animated-icon-button';
import { PageHeader } from '@/components/custom/page-header';
import { SettingsIcon } from '@/components/icons/settings';
import { UserRoundPlusIcon } from '@/components/icons/user-round-plus';
import { Button } from '@/components/ui/button';
import { InviteUserDialog, projectMembersHooks } from '@/features/members';
import { projectCollectionUtils } from '@/features/projects';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';

import { ProjectSettingsDialog } from '../project-settings';

import { ProjectSwitcher } from './project-switcher';
import { SectionNavMenu } from './section-nav-menu';

export const ProjectDashboardPageHeader = ({
  children,
  description,
  pathnameOverride,
  showSidebarToggle = true,
}: {
  children?: React.ReactNode;
  description?: React.ReactNode;
  pathnameOverride?: string;
  showSidebarToggle?: boolean;
}) => {
  const { project } = projectCollectionUtils.useCurrentProject();
  const { platform } = platformHooks.useCurrentPlatform();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'general' | 'members' | 'alerts' | 'pieces' | 'environment'
  >('general');
  const location = useLocation();
  const pathname = pathnameOverride ?? location.pathname;
  const { projectMembers } = projectMembersHooks.useProjectMembers();
  const activeProjectMembers = projectMembers?.filter(
    (member) => member.user.status === UserStatus.ACTIVE,
  );
  const { checkAccess } = useAuthorization();
  const { data: user } = userHooks.useCurrentUser();
  const userHasPermissionToReadProjectMembers = checkAccess(
    Permission.READ_PROJECT_MEMBER,
  );

  const { data: showProjectMembersFlag } = flagsHooks.useFlag<boolean>(
    ApFlagId.SHOW_PROJECT_MEMBERS,
  );

  const userHasPermissionToInviteUser = checkAccess(
    Permission.WRITE_INVITATION,
  );

  const showProjectMembersIcons =
    showProjectMembersFlag &&
    userHasPermissionToReadProjectMembers &&
    !isNil(activeProjectMembers) &&
    project.type === ProjectType.TEAM;

  const userCanInviteToProject =
    userHasPermissionToInviteUser &&
    project.type === ProjectType.TEAM &&
    platform.plan.projectRolesEnabled;
  const userCanInviteToPlatform = user?.platformRole === PlatformRole.ADMIN;
  const showInviteUserButton =
    userCanInviteToProject || userCanInviteToPlatform;
  const isProjectPage = pathname.includes('/projects/');

  const hasGeneralSettings =
    project.type === ProjectType.TEAM ||
    (platform.plan.embeddingEnabled &&
      user?.platformRole === PlatformRole.ADMIN);

  const getFirstAvailableTab = ():
    | 'general'
    | 'members'
    | 'alerts'
    | 'pieces'
    | 'environment' => {
    if (hasGeneralSettings) return 'general';
    if (
      project.type === ProjectType.TEAM &&
      showProjectMembersFlag &&
      userHasPermissionToReadProjectMembers
    )
      return 'members';
    return 'pieces';
  };

  const currentPage = getCurrentPageBreadcrumb(pathname);

  const titleContent = (
    <div className="flex min-w-0 items-center gap-0.5">
      <ProjectSwitcher />
      {currentPage && (
        <>
          <span className="text-sm font-normal text-muted-foreground/40">
            /
          </span>
          <SectionNavMenu label={currentPage.label} />
        </>
      )}
    </div>
  );

  const rightContent = isProjectPage ? (
    <div className="flex items-center gap-3">
      {showProjectMembersIcons && (
        <Button
          variant="ghost"
          className="gap-2"
          aria-label={`View ${activeProjectMembers?.length} team member${
            activeProjectMembers?.length !== 1 ? 's' : ''
          }`}
          onClick={() => {
            setSettingsInitialTab('members');
            setSettingsOpen(true);
          }}
        >
          <UsersRound className="w-4 h-4" />
          <span className="text-sm font-medium">
            {activeProjectMembers?.length}
          </span>
        </Button>
      )}
      {showInviteUserButton && (
        <AnimatedIconButton
          icon={UserRoundPlusIcon}
          iconSize={16}
          variant="ghost"
          size="sm"
          onClick={() => setInviteOpen(true)}
        >
          <span className="text-sm font-medium">{t('Add Members')}</span>
        </AnimatedIconButton>
      )}
      <AnimatedIconButton
        icon={SettingsIcon}
        iconSize={16}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          setSettingsInitialTab(getFirstAvailableTab());
          setSettingsOpen(true);
        }}
      />
    </div>
  ) : (
    children
  );

  return (
    <>
      <PageHeader
        title={titleContent}
        description={description}
        rightContent={rightContent}
        showSidebarToggle={showSidebarToggle}
        className="min-w-full h-12 border-b px-2 py-0"
      />
      <InviteUserDialog open={inviteOpen} setOpen={setInviteOpen} />
      <ProjectSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsInitialTab}
        initialValues={{
          projectName: project?.displayName,
        }}
      />
    </>
  );
};

function getCurrentPageBreadcrumb(
  pathname: string,
): ProjectPageBreadcrumb | null {
  const segment = PROJECT_SECTION_REGEX.exec(pathname)?.[1];
  if (isNil(segment)) {
    return null;
  }
  return (
    PROJECT_PAGE_BREADCRUMBS.find((page) => page.segments.includes(segment)) ??
    null
  );
}

const PROJECT_SECTION_REGEX = /^\/projects\/[^/]+\/([^/]+)/;

const PROJECT_PAGE_BREADCRUMBS: ProjectPageBreadcrumb[] = [
  { segments: ['automations', 'flows', 'tables'], label: 'Automations' },
  { segments: ['runs'], label: 'Runs' },
  { segments: ['connections'], label: 'Connections' },
  { segments: ['variables'], label: 'Variables' },
  { segments: ['releases'], label: 'Releases' },
  { segments: ['settings'], label: 'Settings' },
];

type ProjectPageBreadcrumb = {
  segments: string[];
  label: string;
};
