import { useEffect, useState } from 'react';
import styles from './FavFoldersSidebarSection.module.scss';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { panelRoutes, preRoutes } from 'components/_routes';
import { IFavoriteFolders, SingleFavFolder } from 'app/interfaces/Folders';
import { getExplorerData } from 'app/services/screenshots';
import { getExplorerDataVideo } from 'app/services/videos';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import { addImageFolderToFavsAPI } from 'app/services/api/image';
import { addVideoFolderToFavsAPI } from 'app/services/api/video';
import { addWorkspaceFolderToFavsAPI } from 'app/services/api/workspace';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import { parseCollectionToArray } from 'misc/_helper';
import {
  clearToasts,
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import Queue from 'queue-promise';
import { Tooltip } from 'antd';

const queue = new Queue({
  concurrent: 1,
  interval: 1,
  start: true,
});

const imagesPage = preRoutes.media + panelRoutes.images;
const videosPage = preRoutes.media + panelRoutes.videos;
const workspacePage = preRoutes.media + panelRoutes.workspace;

interface Props {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const FavFoldersSidebarSection = ({ visible, setVisible }: Props) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [favorites, setFavorites] = useState<SingleFavFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );

  useEffect(() => {
    if (!router.isReady || !favoriteFolders) return;

    const favoriteFolderImages = parseCollectionToArray(
      favoriteFolders.images,
    ).map((imageFolder) => {
      return {
        ...imageFolder,
        type: ItemTypeEnum.images,
      };
    });

    const favoriteFolderVideos = parseCollectionToArray(
      favoriteFolders.videos,
    ).map((videoFolder) => {
      return {
        ...videoFolder,
        type: ItemTypeEnum.videos,
      };
    });

    const favoriteFolderWorkspaces = parseCollectionToArray(
      favoriteFolders.workspaces,
      true,
    )
      .map((workspacesFavoriteFolders) => {
        const workspaceId = workspacesFavoriteFolders.id;
        delete workspacesFavoriteFolders.id;

        const parsed = parseCollectionToArray(workspacesFavoriteFolders);
        const workspaceFolders = parsed.map((favoriteFolder) => {
          return {
            ...favoriteFolder,
            type: ItemTypeEnum.mixed,
            workspaceId,
          };
        });

        return workspaceFolders;
      })
      .flat();

    const favoriteFoldersAll = favoriteFolderImages.concat(
      favoriteFolderVideos,
      favoriteFolderWorkspaces,
    );

    setFavorites(favoriteFoldersAll);
  }, [router, favoriteFolders]);

  const handleClick = async (
    folderId: string,
    type: string,
    workspaceId?: string,
  ) => {
    setLoading(true);
    setVisible(false);

    switch (type) {
      case ItemTypeEnum.images:
        router.push(imagesPage);
        await getExplorerData(folderId, true);
        break;
      case ItemTypeEnum.videos:
        router.push(videosPage);
        await getExplorerDataVideo(folderId, true);
        break;
      case ItemTypeEnum.mixed:
        if (!workspaceId) break;
        router.push(`${workspacePage}/${workspaceId}?folder=${folderId}`);
        break;
      default:
        break;
    }

    setLoading(false);
  };

  const handleUnfavorite = async (
    event: any,
    folderId: string,
    itemType: ItemTypeEnum,
    workspaceId?: string,
  ) => {
    event.stopPropagation();

    queue.enqueue(async () => {
      const toast = loadingMessage('Removing folder from favorites...');

      let response = null;
      switch (itemType) {
        case ItemTypeEnum.images:
          response = await addImageFolderToFavsAPI(folderId, true);
          break;
        case ItemTypeEnum.videos:
          response = await addVideoFolderToFavsAPI(folderId, true);
          break;
        case ItemTypeEnum.mixed:
          if (!workspaceId) break;
          response = await addWorkspaceFolderToFavsAPI(workspaceId, folderId);
          break;
        default:
          break;
      }

      if (!response) return;

      const data = iDataResponseParser<typeof response.data>(response);

      if (data) {
        dispatch(PanelAC.setFavoriteFolders({ folders: data }));
        clearToasts();
        updateMessage(toast, 'Folder removed successfully.', 'success');
      }
    });
  };

  return (
    <>
      <div
        className={classNames(
          styles.mainWrapper,
          visible ? styles.visible : styles.hidden,
        )}
      >
        <div className={styles.goBackWrapper} onClick={() => setVisible(false)}>
          <AppSvg
            path="/common/arrow_back-light.svg"
            size="25px"
            className={styles.goBackSvg}
          />
          <div className={styles.goBack}>Go back</div>
        </div>
        <div className={styles.foldersOuterWrapper}>
          <div className={styles.innerWrapper}>
            <h2 className={styles.heading}>Favorite Folders</h2>
            <hr className={styles.hr} />
            <div className={classNames(styles.foldersWrapper, 'scroll-div')}>
              {favorites.length ? (
                favorites.sort((a, b) => a.name.localeCompare(b.name))
                .map((folder) => {
                  return (
                    <div
                      key={folder.id}
                      className={styles.singleFolder}
                      onClick={() =>
                        handleClick(folder.id, folder.type, folder?.workspaceId)
                      }
                    >
                      <div className={styles.singleFolderIconName}>
                        <AppSvg path="/common/fav-folder.svg" size="35px" />
                        <div className={styles.folderName}>{folder.name}</div>
                      </div>

                      <Tooltip
                        className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer"
                        placement="topRight"
                        title="Unfavorite folder"
                        mouseEnterDelay={1}
                      >
                        <div
                          className={styles.singleFolderUnstar}
                          onClick={(e) =>
                            handleUnfavorite(
                              e,
                              folder.id,
                              folder.type,
                              folder?.workspaceId,
                            )
                          }
                        >
                          <AppSvg path={'/common/star.svg'} size="18px" />
                        </div>
                      </Tooltip>
                    </div>
                  );
                })
              ) : (
                <p>There are no favorite folders.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <AppSpinner show={loading} />
    </>
  );
};

export default FavFoldersSidebarSection;
