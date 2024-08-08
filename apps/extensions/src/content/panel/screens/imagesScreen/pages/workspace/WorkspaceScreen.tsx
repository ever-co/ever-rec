import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import {
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import useFolderOrder from '@/content/panel/screens/imagesScreen/pages/shared/hooks/useFolderOrder';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { ItemOrderEnum } from '@/content/panel/screens/imagesScreen/pages/shared/enums/itemOrderEnum';
import { uploadFile } from '@/app/services/screenshots';
import { DbImgData, IDbFolderData } from '@/app/interfaces/IEditorImage';
import SortingDropDown from '@/content/panel/screens/imagesScreen/components/sortingDropDown/SortingDropDown';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import FolderItem from '@/content/panel/screens/imagesScreen/components/folderItem/FolderItem';
import { FolderTypeEnum } from '@/content/panel/screens/imagesScreen/pages/shared/enums/folderTypeEnum';
import classNames from 'classnames';
import { useSearchParams } from 'react-router-dom';
import { createWorkspaceFolderAPI } from '@/app/services/api/workspace';
import WorkspaceItemsContainer from '@/content/panel/screens/imagesScreen/pages/workspace/WorkspaceItemsContainer';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import WorkspaceFolderHistory from '@/content/panel/screens/imagesScreen/pages/workspace/WorkspaceFolderHistory';
import CreateFolderModal from '@/content/panel/screens/imagesScreen/components/createFolderModal/CreateFolderModal';
import { IFavoriteFolders } from '@/app/interfaces/Folders';
import useWorkspaceItemsPermission from '@/content/panel/hooks/useWorkspaceItemsPermission';
import WorkspaceTeamsModal from './workspaceTeamsModal/WorkspaceTeamsModal';
import {
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import { leaveWorkspaceTeam } from '@/app/services/workspaceTeams';
import WorkspaceTeamMembers from '../workspaces/WorkspaceTeamMembers';
import { VideoCustomEventsEnum } from '@/content/utilities/misc/customEvents';
import LibraryActions from '../shared/components/LibraryActions';
import UploadImageModal from '../../components/uploadImageModal/UploadImageModal';
import {
  uploadWorkspaceImageFile,
  uploadWorkspaceVideoFile,
} from '@/app/services/workspace';
import styles from '@/content/panel/styles/Shared.module.scss';
import useItemsFilter from '@/content/panel/hooks/useItemsFilter';
import { ItemTypeEnum } from '../shared/enums/itemTypeEnum';
import useItemOrder from '../shared/hooks/useItemOrder';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';
import InviteMembersModal from './InviteMembersModal/InviteMembersModal';

const Workspace: FC = () => {
  const dispatch = useDispatch();
  const imageFileUploaderRef = useRef<HTMLInputElement>(null);
  const videoFileUploaderRef = useRef<HTMLInputElement>(null);
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const folderOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceFolderOrder,
  );
  const currentWorkspaceFolder = useSelector(
    (state: RootStateOrAny) => state.panel.currentWorkspaceFolder,
  );
  const workspaceLoaded = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceLoaded,
  );
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [showInviteMembersModal, setShowInviteMembersModal] = useState(false);
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null);
  const { folderData, handleFolderOrderByName, handleFolderOrderByDate } =
    useFolderOrder<IWorkspaceDbFolder>(
      workspace,
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
  const [loading, setLoading] = useState<boolean>(false);

  const items = useMemo(() => {
    const screenshots = (workspace?.screenshots || []).filter(
      (x) =>
        x.dbData.parentId === (currentWorkspaceFolder?.id || false) &&
        canViewItem(x.dbData),
    );
    const videos =
      (workspace?.videos || []).filter(
        (x) =>
          x.dbData.parentId === (currentWorkspaceFolder?.id || false) &&
          canViewItem(x.dbData),
      ) || [];
    return [...screenshots, ...videos];
  }, [workspace, currentWorkspaceFolder]);

  const itemOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceItemOrder,
  );
  const { itemData, handleItemOrderByName, handleItemOrderByDate } =
    useItemOrder(items, itemOrder, ItemTypeEnum.mixed, filterTeamId);
  const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);

  const isWorkspaceAdmin = activeWorkspace?.admin === user?.id;

  const parseWorkFolders = useCallback(
    (currentFolderId?: string) => {
      const parsedFolders =
        activeWorkspace.folders?.filter((folder) => {
          const isCurrentFolder =
            folder.parentId === (currentFolderId || false);

          return isCurrentFolder && canViewItem(folder);
        }) || [];

      return parsedFolders;
    },
    [activeWorkspace?.folders],
  );

  useEffect(() => {
    if (!activeWorkspace) return;

    const folder = searchParams.get('folder');
    const currentFolder = activeWorkspace.folders?.find((x) => x.id === folder);

    const parsedFolders = parseWorkFolders(currentFolder?.id);

    dispatch(
      PanelAC.setCurrentWorkspaceFolder({
        currentWorkspaceFolder: currentFolder || null,
      }),
    );

    setWorkspace({ ...activeWorkspace, workFolders: parsedFolders });
  }, [searchParams, activeWorkspace?.folders]);

  // An effect that will update active work folders when permission modal is closed
  useEffect(() => {
    const closePermissionModalEventHandler = () => {
      const folder = searchParams.get('folder');
      const currentFolder = activeWorkspace.folders?.find(
        (x) => x.id === folder,
      );

      const parsedFolders = parseWorkFolders(currentFolder?.id);

      setWorkspace({ ...activeWorkspace, workFolders: parsedFolders });
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
  }, [activeWorkspace, parseWorkFolders, dispatch]);

  const createFolderHandler = async (name: string, color: string) => {
    if (workspace) {
      setLoading(true);
      setShowFolderModal(false);
      const response = await createWorkspaceFolderAPI(
        workspace.id,
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
    }
  };

  const onDrop = async (
    e: React.DragEvent<HTMLDivElement> | undefined,
    folder: IDbFolderData,
  ) => {
    const id = e?.dataTransfer.getData('id');
    if (id) {
      const files = [
        ...(workspace?.screenshots || []),
        ...(workspace?.videos || []),
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
    folder && searchParams.set('folder', folder.id);
    setSearchParams(searchParams);
  };

  const changeUploadFileHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      setLoading(true);
      await uploadFile(
        workspace?.currentFolder?.id || false,
        event.target.files[0],
        workspace?.currentFolder || null,
      );
      //TODO
      /* if(workspace?.currentFolder){
        await increaseFolderItems(workspace.currentFolder, 'image');
      } */
      setLoading(false);
    }
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

    const newWorkspace: any = {
      ...workspace,
      screenshots: [...activeWorkspace.screenshots, data],
    };

    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));
  };
  const onImageUploadDrop = async (event: React.DragEvent<HTMLDivElement>) => {
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
        const newWorkspace: any = {
          ...workspace,
          videos: [...activeWorkspace.videos, data],
        };

        dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));
      }

      setLoading(false);
    }
  };
  // End of upload item functions

  return (
    <>
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
                <h3 className={styles.mainHeader}>Folders</h3>
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
                      isFavorite={!!isFavorite(folder)}
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
              canEditFolder={canEditFolder}
              canEditItem={canEditItem}
              canViewItem={canViewItem}
              onTeamFilter={(teamId) => setFilterTeamId(teamId)}
              handleItemOrderByName={handleItemOrderByName}
              handleItemOrderByDate={handleItemOrderByDate}
              itemData={itemData}
              filterItemData={filterItemData}
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

      <WorkspaceTeamsModal
        user={user}
        visible={showTeamsModal}
        isWorkspaceAdmin={isWorkspaceAdmin}
        workspaceId={activeWorkspace?.id || ''}
        workspace={activeWorkspace}
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
    </>
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
