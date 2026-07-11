import { t } from 'i18next';
import { Columns2, LucideIcon, Maximize2 } from 'lucide-react';
import { useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function ChatLayoutToggle({
  mode,
  onModeChange,
}: ChatLayoutToggleProps) {
  const items = [
    { mode: 'fullscreen', label: t('Fullscreen'), Icon: Maximize2 },
    { mode: 'split', label: t('Split screen'), Icon: Columns2 },
  ] as const;

  return (
    <div
      role="group"
      className="relative flex items-center gap-0.5 rounded-md bg-muted p-0.5"
    >
      {/* The active-button pill: one element sliding between the two slots
          (28px button + 2px gap) instead of a background jumping per button. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute left-0.5 top-0.5 h-7 w-7 rounded-[5px] bg-background shadow-sm transition-transform duration-200 ease-in-out',
          mode === 'split' && 'translate-x-[30px]',
        )}
      />
      {items.map(({ mode: itemMode, label, Icon }) => (
        <ToggleItem
          key={itemMode}
          label={label}
          Icon={Icon}
          isActive={mode === itemMode}
          onSelect={() => onModeChange(itemMode)}
        />
      ))}
    </div>
  );
}

function ToggleItem({ label, Icon, isActive, onSelect }: ToggleItemProps) {
  // Closing the tooltip by clicking its trigger should feel instant; the
  // fade-out stays only for hover-away closes.
  const [closeInstantly, setCloseInstantly] = useState(false);

  return (
    <Tooltip
      onOpenChange={(open) => {
        if (open) setCloseInstantly(false);
      }}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={isActive}
          onPointerDown={() => setCloseInstantly(true)}
          onClick={() => {
            setCloseInstantly(true);
            onSelect();
          }}
          className={cn(
            'relative flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground',
            isActive && 'text-foreground',
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className={cn(closeInstantly && 'data-[state=closed]:animate-none')}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export type ChatLayoutMode = 'fullscreen' | 'split';

type ChatLayoutToggleProps = {
  mode: ChatLayoutMode;
  onModeChange: (mode: ChatLayoutMode) => void;
};

type ToggleItemProps = {
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
  onSelect: () => void;
};
