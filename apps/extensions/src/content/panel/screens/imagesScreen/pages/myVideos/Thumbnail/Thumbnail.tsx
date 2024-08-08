import { FC, Dispatch, SetStateAction } from 'react';
import styles from './Thumbnail.module.scss';
import classNames from 'classnames';
import ThumbnailSkeletonLoader from './ThumbnailSkeletonLoader';

interface ThumbnailProps {
  thumbnailUrl?: string | null;
  videoUrl: string;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

const Thumbnail: FC<ThumbnailProps> = ({
  thumbnailUrl,
  videoUrl,
  loading,
  setLoading,
}) => (
  <div className={classNames(styles.thumbnail, loading && styles.paddingTop)}>
    {loading && <ThumbnailSkeletonLoader />}

    {thumbnailUrl ? (
      <img src={thumbnailUrl} onLoad={() => setLoading(false)} alt="" />
    ) : (
      <video
        src={videoUrl}
        className={styles.video}
        onLoadedMetadata={() => setLoading(false)}
      ></video>
    )}
  </div>
);

export default Thumbnail;
