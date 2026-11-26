import styles from './AppSpinnerLocal.module.scss';

interface Props {
  /** No longer used: the ring has no inner disc to match the ground it sits on. */
  circleInnerColor?: string;
  /** No longer used: the ring takes the text colour of its place, so it shows in both themes. */
  circleColor?: string;
}

/**
 * A small spinner for inside a button or a row. It fills its parent and is drawn in
 * `currentColor`, so it reads on any button in the light and the dark theme.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AppSpinnerLocal = (_props: Props) => {
  return <div className={styles.loadingSpinner} role="status"></div>;
};

export default AppSpinnerLocal;
