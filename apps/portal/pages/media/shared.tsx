import React, { useEffect, useState } from 'react';
import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { getShared } from 'app/services/screenshots';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { getSharedVideos } from 'app/services/videos';
import ImagesAndVideosContainer from '../../components/pagesComponents/_imagesScreen/pages/shared/ImagesAndVideosContainer';
import PanelAC from 'app/store/panel/actions/PanelAC';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import MediaIndex from './index';
import { IUser } from '../../app/interfaces/IUserData';
import styles from 'pagesScss/Shared.module.scss';
import ReactMarkdown from 'react-markdown';
import classNames from 'classnames';
import SCHeader from 'components/shared/SCHeader/SCHeader';

const Shared: React.FC = () => {
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
    if (!sharedVideosLoaded || !sharedImagesLoaded) {
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
    <MediaIndex>
      <div
        className="tw-relative"
        // sharedContainer
      >
        <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />

        <DashboardCard>
          <div className={styles.pageHeadingWrapper}>
            <h1 className={classNames(styles.mainHeader)}>Shared</h1>
          </div>
        </DashboardCard>

        <DashboardCard style={{ minHeight: '100vh' }}>
          <div className={styles.pageMainSectionWrapper}>
            <h3>Videos and Images</h3>
          </div>

          <ImagesAndVideosContainer
            isShared
            isTrash={false}
            screenshots={sharedImages}
            videos={sharedVideos}
          ></ImagesAndVideosContainer>
        </DashboardCard>
      </div>
      <AppSpinner show={loading} />
    </MediaIndex>
  );
};

export default Shared;
