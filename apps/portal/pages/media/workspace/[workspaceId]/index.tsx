import {
  ChangeEvent,
  DragEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from 'pagesScss/Shared.module.scss';
import MediaIndex from '../../index';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import {
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import WorkspaceItemsContainer from 'components/pagesComponents/_imagesScreen/pages/workspace/WorkspaceItemsContainer';
import SortingDropDown from 'components/pagesComponents/_imagesScreen/components/SortingDropDown';
import classNames from 'classnames';
import FolderItem from 'components/pagesComponents/_imagesScreen/components/folderItem/FolderItem';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import useFolderOrder from 'hooks/useFolderOrder';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { DbImgData, IDbFolderData } from 'app/interfaces/IEditorImage';
import { createWorkspaceFolderAPI } from 'app/services/api/workspace';
import PanelAC from 'app/store/panel/actions/PanelAC';
import CreateFolderModal from 'components/pagesComponents/_imagesScreen/components/CreateFolderModal';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import { useRouter } from 'next/router';
import WorkspaceFolderHistory from 'components/pagesComponents/_workspaceScreen/WorkspaceFolderHistory';
import { IFavoriteFolders } from 'app/interfaces/Folders';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import useWorkspaceItemsPermission from 'hooks/useWorkspaceItemsPermission';
import WorkspaceTeamsModal from 'components/pagesComponents/_imagesScreen/pages/workspace/workspaceTeamsModal/WorkspaceTeamsModal';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import { leaveWorkspaceTeam } from 'app/services/workspaceTeams';
import WorkspaceTeamMembers from 'components/pagesComponents/_workspacesScreen/WorkspaceTeamMembers';
import { VideoCustomEventsEnum } from 'misc/customEvents';
import LibraryActions from 'components/pagesComponents/_imagesScreen/pages/myVideos/LibraryActions';
import {
  uploadWorkspaceImageFile,
  uploadWorkspaceVideoFile,
} from 'app/services/workspace';
import UploadImageModal from 'components/shared/UploadImageModal';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import InviteMembersModal from 'components/pagesComponents/_imagesScreen/pages/workspace/InviteMembersModal/InviteMembersModal';
import useItemOrder from 'hooks/useItemOrder';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import useItemsFilter from 'hooks/useItemsFilter';

const Workspace: FC = () => {
  const imageFileUploaderRef = useRef<HTMLInputElement>(null);
  const videoFileUploaderRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useAuthenticateUser();
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const currentWorkspaceFolder: IWorkspaceDbFolder = useSelector(
    (state: RootStateOrAny) => state.panel.currentWorkspaceFolder,
  );
  const folderOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceFolderOrder,
  );
  const workspaceLoaded = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceLoaded,
  );
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showInviteMembersModal, setShowInviteMembersModal] = useState(false);
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null);
  const { folderData, handleFolderOrderByName, handleFolderOrderByDate } =
    useFolderOrder(
      activeWorkspace,
      folderOrder,
      FolderTypeEnum.workspaceFolders,
      filterTeamId,
    );
  const {
    canEdit: canEditFolder,
    canViewItem,
    canEditItem,
  } = useWorkspaceItemsPermission({
    item: currentWorkspaceFolder,
  });

  const items = useMemo(() => {
    const screenshots = (activeWorkspace?.screenshots || []).filter(
      (x) =>
        x.dbData.parentId === (currentWorkspaceFolder?.id || false) &&
        canViewItem(x.dbData),
    );

    const videos =
      (activeWorkspace?.videos || []).filter(
        (x) =>
          x.dbData.parentId === (currentWorkspaceFolder?.id || false) &&
          canViewItem(x.dbData),
      ) || [];

    return [...screenshots, ...videos];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, currentWorkspaceFolder]);

  const itemOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceItemOrder,
  );
  const { itemData, handleItemOrderByName, handleItemOrderByDate } =
    useItemOrder(items, itemOrder, ItemTypeEnum.mixed, filterTeamId);
  const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);

  const isWorkspaceAdmin = activeWorkspace?.admin === user?.id;

  const parseWorkFolders = useCallback(
    (currentFolderId: string) => {
      const parsedFolders =
        activeWorkspace.folders?.filter((folder) => {
          const isCurrentFolder =
            folder.parentId === (currentFolderId || false);

          return isCurrentFolder && canViewItem(folder);
        }) || [];

      return parsedFolders;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeWorkspace?.folders],
  );

  useEffect(() => {
    if (!activeWorkspace) return;

    const { folder } = router.query;
    const currentFolder = activeWorkspace.folders?.find((x) => x.id === folder);

    const parsedFolders = parseWorkFolders(currentFolder?.id as any);

    dispatch(
      PanelAC.setCurrentWorkspaceFolder({
        currentWorkspaceFolder: currentFolder || null,
      }),
    );

    dispatch(
      PanelAC.setActiveWorkspace({
        activeWorkspace: { ...activeWorkspace, workFolders: parsedFolders },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query, dispatch, parseWorkFolders]);

  // An effect that will update active work folders when permission modal is closed
  useEffect(() => {
    const closePermissionModalEventHandler = () => {
      const { folder } = router.query;
      const currentFolder = activeWorkspace.folders?.find(
        (x) => x.id === folder,
      );

      const parsedFolders = parseWorkFolders(currentFolder?.id as any);

      dispatch(
        PanelAC.setActiveWorkspace({
          activeWorkspace: { ...activeWorkspace, workFolders: parsedFolders },
        }),
      );
    };

    window.addEventListener(
      VideoCustomEventsEnum.closePermissionModal,
      closePermissionModalEventHandler,
    );
    return () => {
      window.removeEventListener(
        VideoCustomEventsEnum.closePermissionModal,
        closePermissionModalEventHandler,
      );
    };
  }, [router.query, activeWorkspace, parseWorkFolders, dispatch]);

  const createFolderHandler = async (name: string, color: string) => {
    setLoading(true);
    setShowFolderModal(false);
    const response = await createWorkspaceFolderAPI(
      activeWorkspace.id,
      name,
      currentWorkspaceFolder?.nestLevel || 0,
      currentWorkspaceFolder?.id || false,
      color,
    );
    const data = iDataResponseParser<typeof response.data>(response);

    data &&
      dispatch(
        PanelAC.setActiveWorkspace({
          activeWorkspace: { ...activeWorkspace, folders: data },
        }),
      );

    setLoading(false);
  };

  const onDrop = async (
    e: DragEvent<HTMLDivElement> | undefined,
    folder: IDbFolderData,
  ) => {
    const id = e?.dataTransfer.getData('id');
    if (id) {
      const files = [
        ...(activeWorkspace?.screenshots || []),
        ...(activeWorkspace?.videos || []),
      ];
      const item: IWorkspaceImage | IWorkspaceVideo | undefined = files.find(
        (file) => file.dbData?.id === id,
      );
      if (item?.dbData) {
        setLoading(true);
        const dbData: DbImgData = { ...item.dbData, parentId: folder.id };
        // item && (await updateImageData(dbData));
        // await getExplorerData(workspace?.currentFolder?.id || false);
        setLoading(false);
      }
    }
  };

  const openFolderHandler = (folder: IDbFolderData | null) => {
    router.push({ query: { ...router.query, folder: folder?.id } });
  };

  const isFavorite = useCallback(
    (folder: IWorkspaceDbFolder) => {
      if (favoriteFolders?.workspaces && activeWorkspace) {
        const workspaceFavFolders =
          favoriteFolders.workspaces[activeWorkspace.id];

        return workspaceFavFolders && !!workspaceFavFolders[folder.id];
      }
    },
    [favoriteFolders, activeWorkspace],
  );

  const removeMemberFromActiveWorkspaceTeams = (
    teamId: string,
    teamName: string,
    leftMemberId: string,
    toast: any,
  ) => {
    if (!activeWorkspace) return;

    const newWorkspace = { ...activeWorkspace };
    const newTeamIndex = activeWorkspace.teams.findIndex(
      (team) => team.id === teamId,
    );

    const newTeam = activeWorkspace.teams[newTeamIndex]
      ? activeWorkspace.teams[newTeamIndex]
      : null;

    if (!newTeam) {
      return updateMessage(
        toast,
        'Successfully left the Team, but could not update some data.',
        'warning',
      );
    }

    const leftMemberIndex = newTeam.members.findIndex(
      (member) => member.id === leftMemberId,
    );

    leftMemberIndex !== -1 && newTeam.members.splice(leftMemberIndex, 1);

    newWorkspace.teams[newTeamIndex] = newTeam;

    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));
    updateMessage(toast, 'Successfully left the Team ' + teamName, 'success');
  };

  const leaveTeamHandler = async (
    workspaceId: string,
    teamId: string,
    teamName = '',
  ) => {
    if (workspaceId === '' || !activeWorkspace) return;

    const toast = loadingMessage('Leaving team...');
    const leftMemberId = await leaveWorkspaceTeam(workspaceId, teamId);

    if (!leftMemberId) {
      return updateMessage(toast, 'Could not leave Team.', 'error');
    }

    removeMemberFromActiveWorkspaceTeams(teamId, teamName, leftMemberId, toast);
  };

  // Start of upload item functions
  const uploadImageToWorkspaceAndUpdateLocalState = async (
    folderId: string | false,
    file: File,
    workspaceId: string,
  ) => {
    const data = await uploadWorkspaceImageFile(folderId, file, workspaceId);

    if (!data) return;

    const newWorkspace: IWorkspace = {
      ...activeWorkspace,
      screenshots: [...activeWorkspace.screenshots, data],
    };

    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));
  };
  const onImageUploadDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const file = event?.dataTransfer.files[0];
    if (file) {
      setLoading(true);
      setShowAddImageModal(false);
      await uploadImageToWorkspaceAndUpdateLocalState(
        currentWorkspaceFolder?.id || false,
        file,
        activeWorkspace?.id,
      );
      setLoading(false);
    }
  };
  const onImageUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length && event.target.files?.length) {
      setShowAddImageModal(false);
      setLoading(true);
      await uploadImageToWorkspaceAndUpdateLocalState(
        currentWorkspaceFolder?.id || false,
        event.target.files[0],
        activeWorkspace?.id,
      );
      setLoading(false);
    }
  };
  const onVideoUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length && event.target.files?.length) {
      setLoading(true);

      const data = await uploadWorkspaceVideoFile(
        currentWorkspaceFolder?.id,
        event.target.files[0],
        activeWorkspace?.id,
      );

      if (data) {
        const newWorkspace: IWorkspace = {
          ...activeWorkspace,
          videos: [...activeWorkspace.videos, data],
        };

        dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));
      }

      setLoading(false);
    }
  };
  // End of upload item functions

  return (
    <MediaIndex>
      <section className={styles.mainSection}>
        <SCHeader
          isWorkspace
          isWorkspaceAdmin={isWorkspaceAdmin}
          filterValue={filter}
          userPhotoURL={user?.photoURL}
          onFilterChange={(e) => onFilterChange(e.target.value)}
          onInviteMembersButtonClick={() => setShowInviteMembersModal(true)}
        />

        <DashboardCard className={styles.foldersDashboardCard}>
          <div className={styles.foldersSectionMainHeader}>
            <div className={styles.pageHeadingWrapper}>
              {!currentWorkspaceFolder ? (
                <>
                  <h1 className={styles.mainHeader}>
                    Library - {activeWorkspace?.name}
                  </h1>

                  <WorkspaceTeamMembersWrapper
                    activeWorkspace={activeWorkspace}
                    setShowTeamsModal={setShowTeamsModal}
                  />
                </>
              ) : (
                <>
                  <WorkspaceFolderHistory
                    folders={activeWorkspace?.folders}
                    currentWorkspaceFolder={currentWorkspaceFolder}
                  />

                  <WorkspaceTeamMembersWrapper
                    activeWorkspace={activeWorkspace}
                    setShowTeamsModal={setShowTeamsModal}
                  />
                </>
              )}
            </div>
          </div>

          <LibraryActions
            addImage={canEditFolder}
            addVideo={canEditFolder}
            openModalHandler={() => setShowFolderModal(true)}
            clickAddImageHandler={() => setShowAddImageModal(true)}
            clickAddVideoHandler={() => videoFileUploaderRef?.current?.click()}
            showAddFolderButton={
              (currentWorkspaceFolder?.nestLevel < 2 ||
                currentWorkspaceFolder === null) &&
              canEditFolder
            }
          />

          <>
            {folderData && (
              <div className={styles.foldersHeadingContainer}>
                <h3 className={styles.heading}>Folders</h3>
                <SortingDropDown
                  sortByDate={handleFolderOrderByDate}
                  sortByName={handleFolderOrderByName}
                  sortingType={folderOrder}
                />
              </div>
            )}

            {folderData && (
              <div
                id="scrollableDiv"
                className={classNames(
                  folderData && folderData.length >= 1 && 'scroll-div',
                  styles.foldersScrollableDiv,
                )}
              >
                {folderData.map((folder) => {
                  return (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      onClick={() => openFolderHandler(folder)}
                      onDrop={(e) => onDrop(e, folder)}
                      setLoading={(loadingState) => setLoading(loadingState)}
                      workspace={activeWorkspace}
                      isFavorite={isFavorite(folder) as any}
                      canEdit={canEditItem(folder)}
                    />
                  );
                })}
              </div>
            )}
          </>
        </DashboardCard>

        <DashboardCard
          className={classNames(
            'tw-px-0 tw-pt-0 tw-pb-4 mx-md:tw-h-full tw-flex-1',
            styles.contentDashboardCard,
          )}
        >
          {workspaceLoaded && (
            <WorkspaceItemsContainer
              workspace={activeWorkspace}
              foldersCount={activeWorkspace?.workFolders?.length || 0}
              filterTeamId={filterTeamId}
              canEditItem={canEditItem}
              canViewItem={canViewItem}
              onTeamFilter={(teamId) => setFilterTeamId(teamId)}
              handleItemOrderByName={handleItemOrderByName}
              handleItemOrderByDate={handleItemOrderByDate}
              itemData={itemData}
              filterItemData={filterItemData || []}
              itemOrder={itemOrder}
            />
          )}
        </DashboardCard>
      </section>

      <CreateFolderModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onCreateFolder={createFolderHandler}
      />

      <UploadImageModal
        visible={showAddImageModal}
        onDrop={(e) => onImageUploadDrop(e)}
        enableDropping={(e) => e.preventDefault()}
        onOk={() => imageFileUploaderRef?.current?.click()}
        onCancel={() => setShowAddImageModal(false)}
      />

      {/* TODO */}
      {/* UploadVideoModal */}

      <WorkspaceTeamsModal
        user={user}
        visible={showTeamsModal}
        isWorkspaceAdmin={isWorkspaceAdmin}
        workspace={activeWorkspace}
        workspaceId={activeWorkspace?.id || ''}
        teams={activeWorkspace?.teams ? activeWorkspace.teams : []}
        members={activeWorkspace?.members ? activeWorkspace.members : []}
        onCancel={() => setShowTeamsModal(false)}
        onLeave={leaveTeamHandler}
      />

      <InviteMembersModal
        user={user}
        workspace={activeWorkspace}
        visible={showInviteMembersModal}
        onCancel={() => setShowInviteMembersModal(false)}
      />

      <AppSpinner show={loading || !workspaceLoaded} />

      <input
        id="file"
        type="file"
        accept="video/mp4, video/webm, video/quicktime, .ogg" // TODO: we could accept more, but we need to convert them on the server
        ref={videoFileUploaderRef}
        style={{ display: 'none' }}
        onChange={onVideoUploadChange}
        onClick={(e) => {
          e.currentTarget.value = '';
        }}
      />

      <input
        id="file"
        type="file"
        accept="image/png, image/gif, image/jpeg"
        ref={imageFileUploaderRef}
        style={{ display: 'none' }}
        onChange={onImageUploadChange}
        onClick={(e) => {
          e.currentTarget.value = '';
        }}
      />
    </MediaIndex>
  );
};

export default Workspace;

const WorkspaceTeamMembersWrapper: FC<any> = ({
  activeWorkspace,
  setShowTeamsModal,
}) => {
  return (
    <div className="mx-lg:tw-w-full">
      <div className="tw-flex tw-flex-wrap tw-justify-end">
        <div className="tw-flex tw-justify-end default:tw-w-full default:tw-mb-10px lg:tw-mb-0 tw-items-center">
          {/* <span>Members: </span> */}
          <WorkspaceTeamMembers
            isWorkspace
            team={null}
            onMembersClick={() => setShowTeamsModal(true)}
            teamMemberCount={0}
            teamMembers={activeWorkspace ? activeWorkspace.members : []}
          />
        </div>
      </div>
    </div>
  );
};
