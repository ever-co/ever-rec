import styles from './AppSpinnerLocal.module.scss';

interface Props {
  circleInnerColor?: string;
  circleColor?: string;
}

const AppSpinnerLocal = ({ circleInnerColor, circleColor }: Props) => {
  const circleInnerColorVar = circleInnerColor || '#5b4dbe';
  const circleColorVar = circleColor || '#ffffff';
  return (
    <div
      className={styles.loadingSpinner}
      style={{
        // @ts-ignore
        '--circle-inner-color': `${circleInnerColorVar}`,
        '--circle-color': `${circleColorVar}`,
      }}
    ></div>
  );
};

export default AppSpinnerLocal;
