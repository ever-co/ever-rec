import { FC, ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import Sidebar from './Sidebar/Sidebar';
import { useShell } from 'components/shell/ShellContext';
import { useCreateWorkspace } from 'hooks/useCreateWorkspaceHandler';

interface IProps {
  children?: ReactNode;
  isProfilePage?: boolean;
  isWorkspaceSettingsPage?: boolean;
  /**
   * The assistant panel (shared Ever shell, A7): it sits between the sidebar and the page.
   * Nothing serves an assistant in Ever Rec yet, so no page passes one; the layout is ready for it.
   */
  assistant?: ReactNode;
}

/**
 * The shared Ever app shell (A1): a full-height sidebar on the window colour, and the page in a
 * panel beside it. On phones the sidebar is a drawer, opened from the page's top bar.
 */
const DashboardLayout: FC<IProps> = ({
  children,
  isProfilePage = false,
  isWorkspaceSettingsPage = false,
  assistant,
}) => {
  const { t } = useTranslation();
  const { drawerOpen, setDrawerOpen, drawerTriggerRef } = useShell();
  // One dialog for both sidebars. It is drawn beside the drawer: inside it, the drawer's focus
  // trap would take the focus back from the dialog's field.
  const { Modal: CreateWorkspaceModal, setShowCreateWorkspaceModal } =
    useCreateWorkspace(true);
  // Set when the drawer closes to make room for a dialog: the focus then belongs to the dialog.
  const keepFocusWhereItIs = useRef(false);

  return (
    <div className="shell-viewport tw-flex tw-w-full tw-overflow-hidden tw-bg-sidebar tw-text-foreground">
      {/* Desktop sidebar */}
      <div className="tw-hidden tw-h-full tw-shrink-0 md:tw-block">
        <Sidebar
          isProfilePage={isProfilePage}
          isWorkspaceSettingsPage={isWorkspaceSettingsPage}
          onAddWorkspace={() => setShowCreateWorkspaceModal(true)}
        />
      </div>

      {/*
        Phone drawer. A modal dialog: focus moves into it and stays there, Escape and a tap on
        the scrim close it, and focus goes back to the button that opened it.
      */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="tw-fixed tw-inset-0 tw-z-[900] tw-bg-[hsl(var(--overlay)/var(--overlay-opacity))] data-[state=open]:tw-animate-in data-[state=closed]:tw-animate-out data-[state=closed]:tw-fade-out-0 data-[state=open]:tw-fade-in-0 md:tw-hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              if (keepFocusWhereItIs.current) {
                keepFocusWhereItIs.current = false;
                event.preventDefault();
                return;
              }
              // The button that opens the drawer lives in the page's top bar, not in this
              // dialog, so hand focus back to it ourselves. Without one, Radix decides.
              const opener = drawerTriggerRef.current;
              if (opener?.isConnected) {
                event.preventDefault();
                opener.focus();
              }
            }}
            className="tw-fixed tw-inset-y-0 tw-start-0 tw-z-[901] tw-flex tw-w-[18rem] tw-max-w-[85vw] tw-border-0 tw-border-e tw-border-solid tw-border-sidebar-border tw-bg-sidebar tw-outline-none tw-duration-200 data-[state=open]:tw-animate-in data-[state=closed]:tw-animate-out data-[state=closed]:tw-slide-out-to-left data-[state=open]:tw-slide-in-from-left rtl:data-[state=closed]:tw-slide-out-to-right rtl:data-[state=open]:tw-slide-in-from-right md:tw-hidden"
          >
            <Dialog.Title className="tw-sr-only">
              {t('shell.openNavigation')}
            </Dialog.Title>
            <Sidebar
              inDrawer
              onCloseDrawer={() => setDrawerOpen(false)}
              onAddWorkspace={() => {
                keepFocusWhereItIs.current = true;
                setDrawerOpen(false);
                setShowCreateWorkspaceModal(true);
              }}
              isProfilePage={isProfilePage}
              isWorkspaceSettingsPage={isWorkspaceSettingsPage}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {CreateWorkspaceModal}

      {assistant}

      {/* The page panel */}
      <div className="tw-relative tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-bg-background md:tw-my-2 md:tw-me-2 md:tw-rounded-xl md:tw-shadow-panel">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
