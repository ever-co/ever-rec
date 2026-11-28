import { useTranslation } from 'react-i18next';
import styles from './AppSpinnerLocal.module.scss';

/**
 * A small spinner for inside a button or a row. It fills its parent and is drawn in
 * `currentColor`, so it reads on any button in the light and the dark theme.
 */
const AppSpinnerLocal = () => {
  const { t } = useTranslation();

  return (
    <div
      className={styles.loadingSpinner}
      role="status"
      aria-label={t('shell.loading')}
    ></div>
  );
};

export default AppSpinnerLocal;
