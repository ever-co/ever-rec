import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';

const COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

interface IShellState {
  /** Desktop: the sidebar shows icons only. Kept per browser. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Phone: the sidebar is a drawer; this is whether it is open. */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const ShellContext = createContext<IShellState>({
  collapsed: false,
  toggleCollapsed: () => void 0,
  drawerOpen: false,
  setDrawerOpen: () => void 0,
});

/** Lives in `_app`, so the choice survives page changes (each page mounts its own layout). */
export const ShellProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Read after mount: the server cannot know the stored choice.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1');
    } catch {
      // Storage can be blocked; the sidebar then starts expanded.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Not remembered, still toggled.
      }
      return next;
    });
  }, []);

  // A page change closes the drawer.
  useEffect(() => {
    const close = () => setDrawerOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
      drawerOpen,
      setDrawerOpen,
    }),
    [collapsed, toggleCollapsed, drawerOpen],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
};

export const useShell = () => useContext(ShellContext);
