import React, { DragEvent, SyntheticEvent, useMemo, useState } from 'react';
import IEditorImage from 'app/interfaces/IEditorImage';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import classNames from 'classnames';
import useInitImageVideoItem from 'hooks/useInitImageVideoItem';
import ItemFooter from 'components/pagesComponents/_imagesScreen/components/ItemFooter';
import { Dropdown } from 'antd';
import ItemDropdownActions, {
  IDropdownAvailableActions,
} from 'components/pagesComponents/_imagesScreen/components/contextMenu/ItemDropdownActions';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import { defaultAvailableActions } from 'components/pagesComponents/_imagesScreen/components/contextMenu/containerDropdownActions';
import {
  IWorkspace,
  IWorkspaceImage,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import styles from './ScreenshotItem.module.scss';

interface IScreenshotItemProps {
  id?: number;
  workspace?: IWorkspace;
  screenshot: IEditorImage | IWorkspaceImage;
  canEdit?: boolean;
  hasRestore?: boolean;
  isDraggable?: boolean;
  availableActions?: IDropdownAvailableActions;
  selectedItems?: {
    state: boolean;
    items: (IEditorImage | IWorkspaceImage | IWorkspaceVideo)[];
  };
  addSelected?: React.Dispatch<
    React.SetStateAction<{
      state: boolean;
      items: (IEditorImage | IWorkspaceImage | IWorkspaceVideo)[];
    }>
  >;
  updateTitle: (title: string) => void;
  onSelect: () => void;
  onDelete: () => void;
  onRestoreFromTrash?: () => void;
  onDropdownAction: (action: ItemActionsEnum, e: SyntheticEvent) => void;
  onDropdownVisibleChange: (visible: boolean) => void;
}

const ScreenshotItem: React.FC<IScreenshotItemProps> = ({
  id,
  workspace,
  screenshot,
  canEdit,
  hasRestore = false,
  isDraggable = true,
  availableActions = defaultAvailableActions,
  addSelected,
  selectedItems,
  updateTitle,
  onSelect,
  onDelete,
  onRestoreFromTrash,
  onDropdownAction,
  onDropdownVisibleChange,
}) => {
  const canEditTitle = useMemo(
    () => (workspace && canEdit) || !workspace,
    [workspace, canEdit],
  );
  const { titleContainer, editTitle, created, setTitleFocus } =
    useInitImageVideoItem({
      updateTitle,
      item: screenshot,
      forSinglePage: false,
      canEditTitle,
    });

  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);

  const isSelected: boolean = selectedItems
    ? selectedItems.items.filter(
        (item) => item.dbData?.id == screenshot.dbData?.id,
      ).length > 0
    : false;

  const selectItem = (e: React.MouseEvent) => {
    if (addSelected && screenshot && selectedItems) {
      const selected: boolean =
        selectedItems.items.filter(
          (item) => item.dbData?.id == screenshot.dbData?.id,
        ).length > 0;
      if (!selected) {
        const currentItems: (IEditorImage | IWorkspaceImage)[] =
          selectedItems.items;
        currentItems.push(screenshot);
        addSelected({ state: true, items: currentItems });
      } else {
        const currentItems: (IEditorImage | IWorkspaceImage)[] =
          selectedItems.items.filter(
            (item) => item.dbData?.id != screenshot.dbData?.id,
          );
        if (currentItems.length === 0) {
          addSelected({ state: false, items: [] });
        } else {
          addSelected({ state: true, items: currentItems });
        }
      }
    }
  };

  const onDropdownActionHandler = (action: ItemActionsEnum, e) => {
    setDropdownVisible(false);
    onDropdownAction(action, e);
  };

  const dropdownVisibleChangeHandler = (visible: boolean) => {
    setDropdownVisible(visible);
    onDropdownVisibleChange(visible);
  };

  let views = 0;
  if (Array.isArray(screenshot?.dbData?.views)) {
    views = screenshot?.dbData?.views.length || 0;
  } else {
    views = screenshot?.dbData?.views || 0;
  }

  return (
    <div
      id={`image_${screenshot?.dbData?.id}`}
      className="tw-mb-5 screenshot-item"
    >
      <div
        draggable={isDraggable}
        className={classNames(
          'tw-rounded-2lg default:tw-h-42vw tw-relative tw-cursor-pointer tw-mt-4 tw-overflow-hidden tw-border tw-border-solid md:tw-h-60 lg:tw-h-44 xl:tw-h-52 2xl:tw-h-60',
          isSelected && selectedItems?.items.length !== 0
            ? 'tw-border-primary-purple tw-shadow-xl tw-border-2 tw-border-dotted border-in'
            : 'tw-border-app-grey tw-border-opacity-20',
          styles.wrapper,
        )}
        onDragStart={(ev: DragEvent) => {
          ev.dataTransfer.effectAllowed = 'move';
          screenshot.dbData?.id &&
            ev.dataTransfer.setData('id', screenshot.dbData?.id);
        }}
        onClick={onSelect}
      >
        <div className="tw-flex tw-items-center tw-h-full tw-justify-center">
          <div>
            <img src={screenshot?.url} className="tw-object-cover tw-w-full" />
          </div>
        </div>

        <div
          className={classNames(
            'screenshot-item-overlay tw-absolute tw-bg-opacity-60 tw-bg-overlay-black tw-top-0 tw-left-0 tw-w-full tw-h-full tw-flex tw-p-3',
            selectedItems?.state ? null : 'tw-invisible',
            hasRestore
              ? 'tw-justify-center tw-items-center'
              : addSelected
              ? 'tw-justify-between tw-items-start'
              : 'tw-justify-end tw-items-start',
          )}
          style={{ visibility: dropdownVisible ? 'visible' : null }}
          onClick={onSelect}
        >
          {hasRestore && onRestoreFromTrash && (
            <AppButton onClick={onRestoreFromTrash} bgColor="tw-bg-transparent">
              <AppSvg
                className="tw-text-white"
                path="/images/restore.svg"
                size="26px"
              />
            </AppButton>
          )}
          {!hasRestore ? (
            <>
              {/* TODO fix selecting items for workspace */}
              {addSelected && (
                <AppButton bgColor="tw-bg-transparent" onClick={selectItem}>
                  <AppSvg
                    className="tw-text-white"
                    path={
                      isSelected && selectedItems?.items.length != 0
                        ? '/item/checked.svg'
                        : '/item/unchecked.svg'
                    }
                    size="25px"
                  />
                </AppButton>
              )}
              <Dropdown
                getPopupContainer={() =>
                  document.getElementById(`image_${screenshot?.dbData?.id}`)
                }
                trigger={['click']}
                overlay={
                  <ItemDropdownActions
                    onAction={onDropdownActionHandler}
                    availableActions={availableActions}
                    canEdit={canEdit}
                    workspace={workspace}
                  />
                }
                placement="bottomRight"
                onVisibleChange={dropdownVisibleChangeHandler}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/item/options.svg"
                  alt="options"
                  className="tw-py-2 tw-px-5"
                  draggable={false}
                  style={{
                    height: '50px',
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </Dropdown>
            </>
          ) : (
            <AppButton onClick={onDelete} bgColor="tw-bg-transparent">
              <AppSvg
                className="tw-text-white"
                path="/images/trash.svg"
                size="26px"
              />
            </AppButton>
          )}
        </div>
      </div>

      <div onClick={(e) => e.preventDefault()} className="tw-mt-3 tw-ml-0.5">
        <div
          className={classNames(
            'tw-flex tw-items-start tw-justify-between tw-mt-4 tw-mb-1 tw-pr-1.5',
          )}
        >
          <div
            className={classNames('tw-w-full tw-flex tw-mb-20px lg:tw-h-14')}
          >
            {titleContainer}
          </div>
          {!editTitle && canEditTitle && (
            <div
              className="tw-ml-3 tw-cursor-pointer tw-min-w-20px tw-text-dark-grey"
              onClick={setTitleFocus}
            >
              <AppSvg path="/common/edit-pencil-light.svg" size="20px" />
            </div>
          )}
        </div>
        <ItemFooter
          views={views}
          likes={screenshot.dbData?.likes ? screenshot.dbData?.likes : []}
          comments={screenshot.dbData?.commentsLength}
        />
      </div>
    </div>
  );
};

ScreenshotItem.displayName = 'ScreenshotItem';

export default ScreenshotItem;
