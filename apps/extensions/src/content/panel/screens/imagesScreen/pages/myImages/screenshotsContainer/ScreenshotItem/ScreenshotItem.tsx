import { useMemo, useState } from 'react';
import styles from './ScreenshotItem.module.scss';
import classNames from 'classnames';
import browser from '@/app/utilities/browser';
// TODO: Fix styles - check the portal on how we should handle this
import '../screenshots.scss';
import { IWorkspace, IWorkspaceImage } from '@/app/interfaces/IWorkspace';
import ItemFooter from '../../../../components/itemFooter/ItemFooter';
import ItemDropdownActions, {
  IDropdownAvailableActions,
} from '../../../../components/contextMenu/ItemDropdownActions';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import { defaultAvailableActions } from '../../../../components/contextMenu/containerDropdownActions';
import useInitImageVideoItem from '@/content/utilities/hooks/useInitImageVideoItem';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Dropdown } from 'antd';

interface IScreenshotItemProps {
  id?: number;
  workspace?: IWorkspace;
  screenshot: IEditorImage | IWorkspaceImage;
  hasRestore?: boolean;
  canEdit?: boolean;
  isDraggable?: boolean;
  availableActions?: IDropdownAvailableActions;
  selectedItems?: {
    state: boolean;
    items: (IEditorImage | IWorkspaceImage)[];
  };
  addSelected?: React.Dispatch<
    React.SetStateAction<{
      state: boolean;
      items: (IEditorImage | IWorkspaceImage)[];
    }>
  >;
  updateTitle: (title: string) => void;
  onDelete: () => void;
  onSelect: () => void;
  onRestoreFromTrash?: () => void;
  onDropdownAction: (action: ItemActionsEnum) => void;
  onDropdownVisibleChange: (visible: boolean) => void;
}

const ScreenshotItem: React.FC<IScreenshotItemProps> = ({
  id,
  workspace,
  screenshot,
  hasRestore = false,
  canEdit,
  isDraggable = true,
  availableActions = defaultAvailableActions,
  selectedItems,
  addSelected,
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

  const selectItem = () => {
    if (addSelected && screenshot && selectedItems) {
      const selected: boolean =
        selectedItems.items.filter(
          (item) => item.dbData?.id == screenshot.dbData?.id,
        ).length > 0;
      if (!selected) {
        const currentItems: IEditorImage[] = selectedItems.items;
        currentItems.push(screenshot);
        addSelected({ state: true, items: currentItems });
      } else {
        const currentItems: IEditorImage[] = selectedItems.items.filter(
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

  const onDropdownActionHandler = (action: ItemActionsEnum) => {
    setDropdownVisible(false);
    onDropdownAction(action);
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
          'tw-rounded-2lg default:tw-h-42vw tw-relative tw-cursor-pointer tw-mt-4 tw-overflow-hidden md:tw-h-60 lg:tw-h-44 xl:tw-h-52 2xl:tw-h-60',
          isSelected && selectedItems?.items.length != 0
            ? 'tw-border-primary-purple tw-shadow-xl tw-border-2 tw-border-dotted border-in'
            : '',
          styles.wrapper,
        )}
        onDragStart={(ev: React.DragEvent) => {
          ev.dataTransfer.effectAllowed = 'move';
          screenshot.dbData?.id &&
            ev.dataTransfer.setData('id', screenshot.dbData?.id);
        }}
        onClick={onSelect}
      >
        <div className="tw-flex tw-items-center tw-h-full tw-justify-center">
          <div>
            <img src={screenshot.url} className="tw-object-cover tw-w-full" />
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
          style={{ visibility: dropdownVisible ? 'visible' : undefined }}
          onClick={onSelect}
        >
          {hasRestore && onRestoreFromTrash && (
            <AppButton onClick={onRestoreFromTrash} bgColor="tw-bg-transparent">
              <AppSvg
                className="tw-text-white"
                path="images/panel/images/restore.svg"
                size="26px"
              />
            </AppButton>
          )}
          {!hasRestore ? (
            <>
              {/* TODO fix selecting items for workspace */}
              {addSelected && (
                <AppButton bgColor={'tw-bg-transparent'} onClick={selectItem}>
                  <AppSvg
                    className="tw-text-white"
                    path={
                      isSelected && selectedItems?.items.length != 0
                        ? 'images/panel/item/checked.svg'
                        : 'images/panel/item/unchecked.svg'
                    }
                    size="25px"
                  />
                </AppButton>
              )}
              {/* TODO delete when multiple select is fixed */}
              {workspace && <div></div>}
              <Dropdown
                getPopupContainer={() =>
                  document.getElementById('singleItem') || document.body
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
                onOpenChange={dropdownVisibleChangeHandler}
              >
                <img
                  src={browser.runtime.getURL('images/panel/item/options.svg')}
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
                path="images/panel/images/trash.svg"
                size="26px"
              />
            </AppButton>
          )}
        </div>
      </div>

      <div className="tw-mt-3 tw-ml-0.5">
        <div className="tw-flex tw-items-start tw-justify-between tw-cursor-pointer tw-mt-4 tw-mb-1 tw-pr-1.5">
          <div className="tw-w-full tw-flex tw-max-w-90p tw-mb-20px lg:tw-h-14">
            {titleContainer}
          </div>
          {!editTitle && (
            <div
              className="tw-ml-3 tw-cursor-pointer tw-min-w-20px tw-text-dark-grey"
              onClick={setTitleFocus}
            >
              <AppSvg
                path="images/panel/common/edit-pencil-light.svg"
                size="20px"
              />
            </div>
          )}
        </div>
        <ItemFooter
          views={views}
          likes={screenshot.dbData?.likes ? screenshot.dbData?.likes : []}
          comments={screenshot.dbData?.commentsLength || 0}
        />
      </div>
    </div>
  );
};

export default ScreenshotItem;
