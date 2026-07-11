import { Permission } from '@activepieces/core-utils';
import { t } from 'i18next';
import { Play } from 'lucide-react';
import { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';

import { BoxIcon } from '@/components/icons/box';
import { FileJson2Icon } from '@/components/icons/file-json2';
import { UnplugIcon } from '@/components/icons/unplug';
import { WorkflowIcon } from '@/components/icons/workflow';
import { useEmbedding } from '@/components/providers/embed-provider';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { projectCollectionUtils } from '@/features/projects';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { authenticationSession } from '@/lib/authentication-session';

import { useHoverOpenPopover } from './use-hover-open-popover';

// The header's section title: opens a quick-navigation menu with the project
// pages — on hover it closes when the pointer leaves, a click pins it open.
export function SectionNavMenu({ label }: SectionNavMenuProps) {
  const navigate = useNavigate();
  const { checkAccess } = useAuthorization();
  const { project } = projectCollectionUtils.useCurrentProject();
  const { embedState } = useEmbedding();
  const {
    open,
    handleHoverEnter,
    handleHoverLeave,
    handleOpenChange,
    pinIfHoverOpened,
    close,
  } = useHoverOpenPopover();

  const items = SECTION_NAV_ITEMS.filter(
    (item) =>
      checkAccess(item.permission) &&
      (item.key !== 'releases' ||
        (project.releasesEnabled && !embedState.isEmbedded)),
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="pointer-events-auto h-auto shrink-0 rounded-md px-1.5 py-1 text-sm font-medium"
          onMouseEnter={handleHoverEnter}
          onMouseLeave={handleHoverLeave}
          onClick={pinIfHoverOpened}
        >
          {t(label)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="pointer-events-auto w-48 p-1"
        align="start"
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        {items.map(({ key, label: itemLabel, icon: Icon, path }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              close();
              navigate(authenticationSession.appendProjectRoutePrefix(path));
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Icon className="size-4 shrink-0" size={16} />
            {t(itemLabel)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const SECTION_NAV_ITEMS: SectionNavItem[] = [
  {
    key: 'automations',
    label: 'Automations',
    icon: WorkflowIcon,
    path: '/automations',
    permission: Permission.READ_FLOW,
  },
  {
    key: 'runs',
    label: 'Runs',
    icon: Play,
    path: '/runs',
    permission: Permission.READ_RUN,
  },
  {
    key: 'connections',
    label: 'Connections',
    icon: UnplugIcon,
    path: '/connections',
    permission: Permission.READ_APP_CONNECTION,
  },
  {
    key: 'variables',
    label: 'Variables',
    icon: FileJson2Icon,
    path: '/variables',
    permission: Permission.READ_VARIABLE,
  },
  {
    key: 'releases',
    label: 'Releases',
    icon: BoxIcon,
    path: '/releases',
    permission: Permission.READ_PROJECT_RELEASE,
  },
];

type SectionNavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  path: string;
  permission: Permission;
};

type SectionNavMenuProps = {
  label: string;
};
