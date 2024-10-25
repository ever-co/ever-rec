import { useEffect, useState } from 'react';
import IEditorImage from '@/app/interfaces/IEditorImage';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { getShared } from '@/app/services/screenshots';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { getSharedVideos } from '@/app/services/videos';
import ImagesAndVideosContainer from './imagesAndVideosContainer/ImagesAndVideosContainer';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import { FolderTypeEnum } from './enums/folderTypeEnum';
import { IUser } from '@/app/interfaces/IUserData';
import * as styles from '@/content/panel/styles/Shared.module.scss';
import classNames from 'classnames';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';

const SharedImages: React.FC = () => {
  const dispatch = useDispatch();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const sharedImages: IEditorImage[] = useSelector(
    (state: RootStateOrAny) => state.panel.shared,
  );
  const sharedImagesLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.sharedLoaded,
  );
  const sharedVideos: IEditorVideo[] = useSelector(
    (state: RootStateOrAny) => state.panel.sharedVideos,
  );
  const sharedVideosLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.sharedVideosLoaded,
  );
  const [loading, setLoading] = useState<boolean>(false);

  const foldersType = FolderTypeEnum.sharedFolders;
  useEffect(() => {
    dispatch(PanelAC.showFolders(foldersType));
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (uid && (!sharedVideosLoaded || !sharedImagesLoaded)) {
      (async function () {
        try {
          setLoading(true);
          await getShared();
          await getSharedVideos();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, sharedImagesLoaded, sharedVideosLoaded]);

  return (
    <>
      <div className="tw-relative">
        <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />

        <DashboardCard>
          <div className={styles.pageHeadingWrapper}>
            <h1 className={styles.mainHeader}>Shared</h1>
          </div>
        </DashboardCard>

        <DashboardCard style={{ minHeight: '100vh' }}>
          <h3 className={styles.pageMainSectionWrapper}>Videos and Images</h3>

          <ImagesAndVideosContainer
            isShared
            isTrash={false}
            screenshots={sharedImages}
            videos={sharedVideos}
          ></ImagesAndVideosContainer>
        </DashboardCard>
      </div>
      <AppSpinner show={loading} />
    </>
  );
};

export default SharedImages;
