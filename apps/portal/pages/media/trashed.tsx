import { useEffect, useState } from 'react';
import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import {
  deleteAllScreenshots,
  getTrashed,
  restoreAllScreenshots,
} from 'app/services/screenshots';
import {
  deleteAllVideos,
  getTrashedVideos,
  restoreAllVideos,
} from 'app/services/videos';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import ImagesAndVideosContainer from '../../components/pagesComponents/_imagesScreen/pages/shared/ImagesAndVideosContainer';
import PanelAC from 'app/store/panel/actions/PanelAC';
import AppButton from 'components/controls/AppButton';
import TrashModal from '../../components/pagesComponents/_imagesScreen/pages/trashed/components/TrashModal';
import {
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import MediaIndex from './index';
import { IUser } from '../../app/interfaces/IUserData';
import classNames from 'classnames';
import styles from 'pagesScss/Shared.module.scss';
import MultiItemsSelect from 'components/pagesComponents/_imagesScreen/components/multiItemsSelect/MultiItemsSelect';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { useTranslation } from 'react-i18next';

const Trashed: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const trashImages: IEditorImage[] = useSelector(
    (state: RootStateOrAny) => state.panel.trash,
  );
  const trashImagesLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.trashLoaded,
  );
  const trashVideos: IEditorVideo[] = useSelector(
    (state: RootStateOrAny) => state.panel.trashVideos,
  );
  const trashVideosLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.trashVideosLoaded,
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{
    state: boolean;
    items: IEditorImage[] & IEditorVideo;
  }>({ state: false, items: [] });

  const foldersType = FolderTypeEnum.trashFolders;
  useEffect(() => {
    dispatch(PanelAC.showFolders(foldersType));
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (uid && !trashImagesLoaded && !trashVideosLoaded) {
      (async function () {
        try {
          setLoading(true);
          await getTrashed();
          await getTrashedVideos();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, trashImagesLoaded, trashImages, trashVideosLoaded, trashVideos]);

  const deleteAllItems = async () => {
    setDeleteModal(false);

    if (trashImages.length === 0 && trashVideos.length === 0) {
      return infoMessage('No items to delete...');
    }

    setLoading(true);
    await deleteAllVideos();
    await deleteAllScreenshots();
    setLoading(false);
    successMessage('Items deleted successfully.');
  };

  const restoreAllItems = async () => {
    setRestoreModal(false);

    if (trashImages.length === 0 && trashVideos.length === 0) {
      return infoMessage('No items to restore...');
    }

    setLoading(true);
    await restoreAllVideos();
    await restoreAllScreenshots();
    setLoading(false);
    successMessage('Items restored successfully.');
  };

  return (
    <MediaIndex>
      <div className={styles.trashedContainer}>
        <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />

        <DashboardCard className={styles.trashedHeadingContainer}>
          <div className={styles.pageHeadingWrapper}>
            <h1 className={styles.mainHeader}>{t('page.trashed.title')}</h1>
          </div>
        </DashboardCard>

        <DashboardCard style={{ minHeight: '100vh' }}>
          <div className={styles.trashedItemsHeaderContainer}>
            <div
              className="tw-flex tw-justify-between tw-items-center mx-xl:tw-flex-col"
              style={{ height: '52px' }}
              // trashedItemsHeaderContainer
            >
              <div className={styles.trashedHeaderContainer}>
                <h2 className={styles.recentlyDeleted}>
                  {t('page.trashed.recentlyDeleted')}
                </h2>
              </div>

              <MultiItemsSelect
                items={selectedItems.items}
                show={selectedItems.state}
                type={'mixed'}
                resetSelected={setSelectedItems}
                screenshots={trashImages}
                videos={trashVideos}
                addSelected={setSelectedItems}
                isTrash
              />

              <div
                className="mx-lg:tw-w-full"
                // trashedItemsHeaderButtonsContainer
              >
                <div
                  className="tw-flex tw-justify-end tw-gap-2 mx-xl:tw-my-4"
                  // trashedItemsHeaderButtonsWrapper
                >
                  <div
                    className="default:tw-w-full lg:tw-w-160px lg:tw-mb-0"
                    // trashedButton
                  >
                    <AppButton
                      full
                      outlined
                      className="tw-mr-6"
                      twPadding="tw-py-3 tw-px-7"
                      onClick={() => setDeleteModal(true)}
                    >
                      {t('common.bulkActions.deleteAll')}
                    </AppButton>
                  </div>
                  <div
                    className="default:tw-w-full lg:tw-w-160px lg:tw-mb-0"
                    // trashedButton
                  >
                    <AppButton
                      full
                      twPadding="tw-py-3 tw-px-6"
                      onClick={() => setRestoreModal(true)}
                    >
                      {t('common.bulkActions.restoreAll')}
                    </AppButton>
                  </div>
                </div>
              </div>
            </div>
            {/* TODO: add this information when we implement 30 days automatic item delete. Change the place from here to somewhere else */}
            {/* <div className="tw-flex tw-text-red tw-items-center tw-mt-10px">
              <div style={{ marginTop: '-0.2rem' }}>
                <AppSvg
                  path="/trash/warning.svg"
                  size="18px"
                  className="tw-mr-2"
                />
              </div>
              <p className="tw-m-0">
                Items that have been in Trash more than 30 days will be
                automatically deleted permanently.
              </p>
            </div> */}
          </div>
          <ImagesAndVideosContainer
            isTrash
            screenshots={trashImages}
            videos={trashVideos}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />
        </DashboardCard>
      </div>

      <TrashModal
        visible={restoreModal}
        onCancel={() => setRestoreModal(false)}
        onOk={restoreAllItems}
        title={t('page.trashed.dialog.restoreAll.message')}
        confirmText={t('common.bulkActions.restoreAll')}
      />

      <TrashModal
        visible={deleteModal}
        onCancel={() => setDeleteModal(false)}
        onOk={deleteAllItems}
        title={t('page.trashed.dialog.deleteAll.message')}
        confirmText={t('common.bulkActions.deleteAll')}
        confirmClass="tw-bg-red"
      />

      <AppSpinner show={loading} />
    </MediaIndex>
  );
};

export default Trashed;
