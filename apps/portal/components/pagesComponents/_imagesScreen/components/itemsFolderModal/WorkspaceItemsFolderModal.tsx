import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import AppSvg from '../../../../elements/AppSvg';
import {
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceSelectItemsState,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import WorkspaceFolderSection from './WorkspaceFolderSection';
import { updateItemsFolderAPI } from 'app/services/api/workspace';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import PanelAC from 'app/store/panel/actions/PanelAC';
import {
  errorMessage,
  infoMessage,
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import { useTranslation } from 'react-i18next';

interface IItemsFolderModalProps {
  items?: (IWorkspaceImage | IWorkspaceVideo)[];
  visible: boolean;
  onCancel: () => void;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  updateSingleItem?: React.Dispatch<
    React.SetStateAction<IWorkspaceImage | IWorkspaceVideo>
  >;
  setSelectedState?: React.Dispatch<
    React.SetStateAction<IWorkspaceSelectItemsState>
  >;
}

const WorkspaceItemsFolderModal: React.FC<IItemsFolderModalProps> = ({
  onCancel,
  visible,
  items,
  setVisible,
  setLoading,
  updateSingleItem,
  setSelectedState,
}) => {
  const dispatch = useDispatch();
  const [valid, setValid] = useState(false);
  const { t } = useTranslation();
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

    const folderNameString = selectedFolder
      ? selectedFolder.name
      : `${activeWorkspace.name}`;
    const toast = loadingMessage(
      `${t('toasts.movingItems')} ${folderNameString}...`,
    );

    const itemIds = items?.map((x) => x.dbData?.id);

    const response = await updateItemsFolderAPI(
      activeWorkspace?.id,
      itemIds || ([] as any[]),
      selectedFolder?.id || false,
      currentWorkspaceFolder?.id || false,
    );
    const data = iDataResponseParser<typeof response.data>(response, false);

    if (!data) {
      return updateMessage(
        toast,
        response.message || t('toasts.movingItemsError'),
        'error',
      );
    }

    if (items?.length === 1 && updateSingleItem) {
      const newSingleItem = Object.prototype.hasOwnProperty.call(
        items[0].dbData,
        'duration',
      )
        ? data.videos.find((x) => x.dbData?.id === items[0].dbData?.id)
        : data.screenshots.find((x) => x.dbData?.id === items[0].dbData?.id);

      updateSingleItem(newSingleItem as any);
    }

    setSelectedState && setSelectedState({ state: false, items: [] });
    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: data }));

    updateMessage(
      toast,
      `${t('toasts.itemsMovedTo')} ${folderNameString}.`,
      'success',
    );
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      destroyOnClose={true}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={moveHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={!valid}
          >
            {t('page.image.move')}
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('page.image.cancel')}
          </AppButton>
        </div>
      }
    >
      <WorkspaceFolderSection
        items={items || []}
        workspace={activeWorkspace}
        folders={activeWorkspace?.folders}
        initialOpened={initialOpened}
        setSelectedFolder={setSelectedFolder}
      />
    </Modal>
  );
};

export default WorkspaceItemsFolderModal;
