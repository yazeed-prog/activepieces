import { ReactNode } from 'react';

import { ProjectSwitcher } from './project-switcher';
import { SectionNavMenu } from './section-nav-menu';

// The header title for detail pages (builder, run details, table editor):
// mirrors the dashboard header's breadcrumb but appends the real path —
// project / section / entity.
export function DetailPageBreadcrumb({
  section,
  children,
}: DetailPageBreadcrumbProps) {
  const { label } = SECTIONS[section];

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <ProjectSwitcher />
      <span className="text-sm font-normal text-muted-foreground/40">/</span>
      <SectionNavMenu label={label} />
      <span className="text-sm font-normal text-muted-foreground/40">/</span>
      <div className="flex min-w-0 items-center text-sm font-medium">
        {children}
      </div>
    </div>
  );
}

const SECTIONS: Record<DetailPageSection, { label: string }> = {
  automations: { label: 'Automations' },
  runs: { label: 'Runs' },
};

export type DetailPageSection = 'automations' | 'runs';

type DetailPageBreadcrumbProps = {
  section: DetailPageSection;
  children: ReactNode;
};
