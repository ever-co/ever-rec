import {
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceSelectItemsState,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import { updateItemsFolderAPI } from '@/app/services/api/workspace';
import { useEffect, useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import {
  errorMessage,
  infoMessage,
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import WorkspaceFolderSection from './WorkspaceFolderSection';
import IEditorVideo from '@/app/interfaces/IEditorVideo';

interface IItemsFolderModalProps {
  items?: (IWorkspaceImage | IWorkspaceVideo)[];
  visible: boolean;
  updateSingleItem?: React.Dispatch<
    React.SetStateAction<
      IEditorVideo | IWorkspaceImage | IWorkspaceVideo | null
    >
  >;
  setSelectedState?: React.Dispatch<
    React.SetStateAction<IWorkspaceSelectItemsState>
  >;
  onCancel: () => void;
}

const WorkspaceItemsFolderModal: React.FC<IItemsFolderModalProps> = ({
  onCancel,
  visible,
  items,
  updateSingleItem,
  setSelectedState,
}) => {
  const dispatch = useDispatch();
  const [valid, setValid] = useState(false);
  const [selectedFolder, setSelectedFolder] =
    useState<IWorkspaceDbFolder | null>(null);
  const [initialOpened, setInitialOpened] = useState(true);
  const activeWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const currentWorkspaceFolder: IWorkspaceDbFolder = useSelector(
    (state: RootStateOrAny) => state.panel.currentWorkspaceFolder,
  );

  useEffect(() => {
    const isValid = items?.every(
      (item) => item.dbData.parentId !== (selectedFolder?.id || false),
    );
    setValid(!!isValid);
  }, [items, selectedFolder, activeWorkspace]);

  const moveHandler = async () => {
    onCancel();
    if (!items || !items.length) return;

    const folderNameString = selectedFolder
      ? selectedFolder.name
      : `${activeWorkspace.name}`;
    const toast = loadingMessage(`Moving items to ${folderNameString}...`);

    const itemIds = items.map((x) => x.dbData?.id);
    const response = await updateItemsFolderAPI(
      activeWorkspace?.id,
      itemIds,
      selectedFolder?.id || false,
      currentWorkspaceFolder?.id || false,
    );
    const data = iDataResponseParser<typeof response.data>(response, false);

    if (!data) {
      return updateMessage(
        toast,
        response.message || 'Error while trying to move items.',
        'error',
      );
    }

    if (items.length === 1 && updateSingleItem) {
      const newSingleItem = Object.prototype.hasOwnProperty.call(
        items[0]?.dbData,
        'duration',
      )
        ? data?.videos.find((x) => x.dbData?.id === items[0].dbData?.id)
        : data?.screenshots.find((x) => x.dbData?.id === items[0].dbData?.id);

      newSingleItem && updateSingleItem(newSingleItem);
    }

    setSelectedState && setSelectedState({ state: false, items: [] });
    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: data }));

    updateMessage(toast, `Items moved to ${folderNameString}.`, 'success');
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      destroyOnClose={true}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={moveHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={!valid}
          >
            Move
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
        </div>
      }
    >
      <WorkspaceFolderSection
        items={items as (IWorkspaceImage | IWorkspaceVideo)[]}
        workspace={activeWorkspace}
        folders={activeWorkspace?.folders}
        initialOpened={initialOpened}
        setSelectedFolder={setSelectedFolder}
      />
    </Modal>
  );
};

export default WorkspaceItemsFolderModal;
