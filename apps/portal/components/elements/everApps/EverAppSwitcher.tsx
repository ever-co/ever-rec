/* eslint-disable @next/next/no-img-element */
import {
  FC,
  FocusEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { EverAppRow, EverAppSwitcherModel } from 'misc/everApps';
import EverMark from './EverMark';
import styles from './EverAppSwitcher.module.scss';

// The panel keeps 8 px from both edges of a phone screen.
const VIEWPORT_MARGIN = 8;

// useLayoutEffect warns during server rendering; the panel is never open there.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

function focusableRows(panel: HTMLElement | null): HTMLAnchorElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLAnchorElement>('a[href]')) : [];
}

const AppRowContent: FC<{ app: EverAppRow; line: string }> = ({ app, line }) => (
  <>
    <span className={styles.tile}>
      <img src={app.logo} alt="" width={24} height={24} decoding="async" />
    </span>
    <span className={styles.text}>
      <span className={styles.name}>{app.name}</span>
      <span className={styles.line}>{line}</span>
    </span>
  </>
);

interface EverAppSwitcherProps {
  /** From `EVER_APP_SWITCHER` (misc/everApps): null when the deployment links no other Ever app. */
  model: EverAppSwitcherModel | null;
}

/**
 * The rotating Ever mark in front of the Rec logo opens the list of Ever platforms and apps. Each row is the app's
 * logo, name and one line, and a pick opens that app in this tab (a plain link: Ctrl/Cmd/middle click still opens a
 * new tab). "+ Add" leads to Ever Platform's page for adding your own apps. Nothing renders without a link config.
 */
const EverAppSwitcher: FC<EverAppSwitcherProps> = ({ model }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelId = `ever-apps-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // Keep the panel inside the screen: on a phone the sidebar is the full width and the panel would overflow.
  const place = useCallback(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) {
      return;
    }
    // The panel starts at the button's inline-start edge: its left edge, or its right edge right to left.
    const rect = root.getBoundingClientRect();
    const start =
      getComputedStyle(root).direction === 'rtl' ? window.innerWidth - rect.right : rect.left;
    const overflow = start + panel.offsetWidth - (window.innerWidth - VIEWPORT_MARGIN);
    const next = overflow > 0 ? Math.max(-overflow, VIEWPORT_MARGIN - start) : 0;
    setShift(next);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      return;
    }
    place();
    focusableRows(panelRef.current)[0]?.focus();
  }, [open, place]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const isInside = rootRef.current?.contains(event.target as Node);
      if (!isInside) {
        close(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', place);
    };
  }, [open, close, place]);

  if (!model) {
    return null;
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
      return;
    }
    const isTrigger = event.target === triggerRef.current;
    if (isTrigger && !open && event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      return;
    }
    const rows = focusableRows(panelRef.current);
    if (!open || rows.length === 0) {
      return;
    }
    const index = rows.indexOf(document.activeElement as HTMLAnchorElement);
    const last = rows.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: index < 0 || index === last ? 0 : index + 1,
      ArrowUp: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      rows[moves[event.key]].focus();
    }
  };

  // Tabbing out of the panel closes it; focus stays where the person moved it.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (open && next && !rootRef.current?.contains(next)) {
      setOpen(false);
    }
  };

  const title = t('everApps.title');
  const addLabel = t('everApps.addLabel');

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={t('everApps.switchLabel')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <EverMark />
      </button>

      {open && (
        <nav
          ref={panelRef}
          id={panelId}
          aria-label={title}
          className={styles.panel}
          style={shift ? { insetInlineStart: shift } : undefined}
        >
          <p aria-hidden="true" className={styles.title}>
            {title}
          </p>
          <ul role="list" className={styles.list}>
            {model.apps.map((app) => (
              <li key={app.id}>
                {app.isCurrent ? (
                  <div aria-current="page" className={styles.row}>
                    <AppRowContent app={app} line={t(app.lineKey)} />
                    <CheckOutlined aria-hidden="true" className={styles.check} />
                  </div>
                ) : (
                  <a href={app.url} className={styles.row} onClick={() => setOpen(false)}>
                    <AppRowContent app={app} line={t(app.lineKey)} />
                  </a>
                )}
              </li>
            ))}
          </ul>
          {model.addUrl && (
            <>
              <div aria-hidden="true" className={styles.separator} />
              <a
                href={model.addUrl}
                className={styles.row}
                title={addLabel}
                aria-label={addLabel}
                onClick={() => setOpen(false)}
              >
                <span className={styles.tile}>
                  <PlusOutlined aria-hidden="true" />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{t('everApps.add')}</span>
                </span>
              </a>
            </>
          )}
        </nav>
      )}
    </div>
  );
};

export default EverAppSwitcher;
