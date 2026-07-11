import { useCallback, useEffect, useRef, useState } from 'react';

// Shared open-state for header menus that open on hover as well as click:
// a hover-opened menu closes when the pointer leaves (with small delays that
// forgive a pointer just passing through), while a click-opened (or
// click-pinned) one stays until dismissed. Pair with a modal Popover so the
// rest of the page can't be hovered or clicked while the menu is open.
export function useHoverOpenPopover() {
  const [open, setOpen] = useState(false);
  const hoverOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openedByHoverRef = useRef(false);

  useEffect(() => {
    return () => {
      if (hoverOpenTimeoutRef.current) {
        clearTimeout(hoverOpenTimeoutRef.current);
      }
      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current);
      }
    };
  }, []);

  // While the menu is open nothing else on the page can be hovered or
  // clicked — the trigger and the popover content opt back in with a
  // `pointer-events-auto` class. An outside click only dismisses the menu,
  // it never reaches the element underneath.
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.pointerEvents;
    document.body.style.pointerEvents = 'none';
    return () => {
      document.body.style.pointerEvents = previous;
    };
  }, [open]);

  const handleHoverEnter = useCallback(() => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
    if (open || hoverOpenTimeoutRef.current) return;
    hoverOpenTimeoutRef.current = setTimeout(() => {
      hoverOpenTimeoutRef.current = null;
      openedByHoverRef.current = true;
      setOpen(true);
    }, HOVER_OPEN_DELAY_MS);
  }, [open]);

  const handleHoverLeave = useCallback(() => {
    if (hoverOpenTimeoutRef.current) {
      clearTimeout(hoverOpenTimeoutRef.current);
      hoverOpenTimeoutRef.current = null;
    }
    if (!open || !openedByHoverRef.current || hoverCloseTimeoutRef.current) {
      return;
    }
    hoverCloseTimeoutRef.current = setTimeout(() => {
      hoverCloseTimeoutRef.current = null;
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  }, [open]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      openedByHoverRef.current = false;
    }
    setOpen(nextOpen);
  }, []);

  // Clicking a hover-opened trigger pins the menu open instead of letting the
  // trigger toggle it closed.
  const pinIfHoverOpened = useCallback(
    (event: React.MouseEvent) => {
      if (open && openedByHoverRef.current) {
        openedByHoverRef.current = false;
        event.preventDefault();
      }
    },
    [open],
  );

  const close = useCallback(() => setOpen(false), []);

  return {
    open,
    handleHoverEnter,
    handleHoverLeave,
    handleOpenChange,
    pinIfHoverOpened,
    close,
  };
}

const HOVER_OPEN_DELAY_MS = 150;
const HOVER_CLOSE_DELAY_MS = 200;
