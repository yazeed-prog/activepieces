import { t } from 'i18next';
import { Search } from 'lucide-react';

import { useEmbedding } from '@/components/providers/embed-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useGlobalSearch } from './global-search-context';

export function GlobalSearchCommand({
  variant = 'default',
}: {
  variant?: 'default' | 'compact';
} = {}) {
  const { setOpen } = useGlobalSearch();
  const { embedState } = useEmbedding();
  const isMac =
    typeof navigator !== 'undefined' && /(Mac)/i.test(navigator.userAgent);

  if (embedState.hideGlobalSearch) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          'h-8 shrink-0 gap-1.5 rounded-md px-2 font-normal',
          'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-2!',
        )}
      >
        <Search className="size-4 shrink-0" />
        <kbd className="pointer-events-none flex h-5 select-none items-center gap-px rounded bg-muted py-0.5 px-1 font-mono text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden!">
          {isMac ? (
            <span className="text-sm leading-none">⌘</span>
          ) : (
            <span>Ctrl</span>
          )}
          <span>K</span>
        </kbd>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => setOpen(true)}
      className={cn(
        'h-8 w-full justify-start gap-2 overflow-hidden rounded-md p-2!  text-sm font-normal mr-auto',
        'border border-sidebar-border bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-2!',
      )}
    >
      <Search className="size-4 shrink-0 mr-auto" />
      <span className="flex-1 text-left text-muted-foreground group-data-[collapsible=icon]:hidden">
        {t('Search...')}
      </span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-px rounded border bg-muted py-0.5 px-1 font-mono text-xs font-medium text-muted-foreground sm:flex group-data-[collapsible=icon]:hidden!">
        {isMac ? (
          <span className="text-sm leading-none">⌘</span>
        ) : (
          <span>Ctrl</span>
        )}
        <span>K</span>
      </kbd>
    </Button>
  );
}
