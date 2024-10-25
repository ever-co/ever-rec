import * as styles from './ThumbnailSkeletonLoader.module.scss';

const SkeletonLoader = ({
  width,
  height,
}: {
  width?: number;
  height?: number;
}) => (
  <div
    className={styles.skeleton}
    style={{
      width: width || '100%',
      height: height || '100%',
    }}
  ></div>
);

export default SkeletonLoader;
