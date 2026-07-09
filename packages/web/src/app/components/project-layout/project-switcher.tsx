import {
  PROJECT_COLOR_PALETTE,
  PlatformRole,
  ProjectType,
  TeamProjectsLimit,
} from '@activepieces/shared';
import { t } from 'i18next';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CreateProjectButton,
  getProjectName,
  projectCollectionUtils,
} from '@/features/projects';
import { ProjectLetterAvatar } from '@/features/projects/components/project-letter-avatar';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';

import { recordAccess } from '../global-search/access-history';

export function ProjectSwitcher() {
  const { project: currentProject } =
    projectCollectionUtils.useCurrentProject();
  const { data: projects } = projectCollectionUtils.useAll();
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: currentUser } = userHooks.useCurrentUser();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const showNewProjectButton =
    platform.plan.teamProjectsLimit !== TeamProjectsLimit.NONE &&
    currentUser?.platformRole === PlatformRole.ADMIN;

  const handleSelect = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        const palette = project.icon
          ? PROJECT_COLOR_PALETTE[project.icon.color]
          : null;
        const name = getProjectName(project);
        recordAccess({
          id: `project-${projectId}`,
          type: 'project',
          label: name,
          href: `/projects/${projectId}/automations`,
          iconBgColor: palette?.color,
          iconTextColor: palette?.textColor,
          iconLetter: name.charAt(0).toUpperCase(),
        });
      }
      projectCollectionUtils.setCurrentProject(projectId);
      const section =
        PROJECT_SECTION_REGEX.exec(location.pathname)?.[1] ?? 'automations';
      navigate(`/projects/${projectId}/${section}`);
      setOpen(false);
    },
    [projects, navigate, location.pathname],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto min-w-0 gap-2 rounded-md px-1.5 py-1 font-medium"
        >
          <ProjectLetterAvatar project={currentProject} className="size-4" />
          <span className="truncate max-w-[200px] text-sm leading-5">
            {getProjectName(currentProject)}
          </span>
          {currentProject.type === ProjectType.PERSONAL && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="rounded-[4px] bg-muted px-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {t('Personal')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t('Only you can access it.')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search Projects')} />
          <CommandList>
            <CommandEmpty>{t('No projects found.')}</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${getProjectName(project)}-${project.id}`}
                  className="gap-2"
                  onSelect={() => handleSelect(project.id)}
                >
                  <ProjectLetterAvatar project={project} />
                  <span className="truncate">{getProjectName(project)}</span>
                  {project.type === ProjectType.PERSONAL && (
                    <TooltipProvider delayDuration={400}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="ml-auto rounded-[4px] bg-muted px-1.5 text-xs font-medium text-muted-foreground"
                          >
                            {t('Personal')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {t('Only you can access it.')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {showNewProjectButton && (
            <div className="border-t p-1.5">
              <CreateProjectButton
                variant="full"
                projects={projects}
                onCreate={(project) => {
                  setOpen(false);
                  navigate(`/projects/${project.id}/automations`);
                }}
              />
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const PROJECT_SECTION_REGEX = /^\/projects\/[^/]+\/([^/]+)/;
