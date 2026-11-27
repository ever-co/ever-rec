import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu as MenuIcon } from 'lucide-react';
import { cn } from 'app/utilities/cn';
import { Button } from 'components/ui/button';
import { useShell } from 'components/shell/ShellContext';

/**
 * Opens the navigation drawer on a phone (the sidebar is hidden there). Every page header inside
 * the shell needs one: without it a phone has no way to the navigation, the workspace switcher or
 * the account menu. Focus comes back to this button when the drawer closes.
 */
const DrawerButton: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation();
  const { setDrawerOpen, drawerTriggerRef } = useShell();

  return (
    <Button
      ref={drawerTriggerRef}
      variant="ghost"
      size="icon-sm"
      className={cn('tw-shrink-0 md:tw-hidden', className)}
      aria-label={t('shell.openNavigation')}
      aria-haspopup="dialog"
      onClick={() => setDrawerOpen(true)}
    >
      <MenuIcon />
    </Button>
  );
};

export default DrawerButton;
