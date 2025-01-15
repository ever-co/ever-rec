import { Dropdown } from 'antd';
import classNames from 'classnames';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { IDropdownAvailableActions } from 'components/pagesComponents/_imagesScreen/components/contextMenu/ItemDropdownActions';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import ItemDropdownActions from 'components/pagesComponents/_imagesScreen/components/contextMenu/ItemDropdownActions';
import styles from './VideoItemOverlay.module.scss';

interface OverlayProps {
  videoId?: string;
  workspace?: IWorkspace;
  hasRestore?: boolean;
  isSelected?: boolean;
  canEdit?: boolean;
  canShare?: boolean;
  dropdownVisible?: boolean;
  selectedItems?: {
    state: boolean;
    items: IEditorVideo[];
  };
  availableActions?: IDropdownAvailableActions;
  onSelect?: (e: React.MouseEvent) => void;
  onRestoreFromTrash?: () => void;
  onDelete?: () => void;
  addSelected?: React.Dispatch<
    React.SetStateAction<{
      state: boolean;
      items: IEditorVideo[];
    }>
  >;
  selectItem?: (e: React.MouseEvent) => void;
  onDropdownActionHandler?: (action: string, e: any) => void;
  onDropdownVisibleChange?: (visible: boolean) => void;
}

const Overlay: React.FC<OverlayProps> = ({
  videoId,
  workspace,
  isSelected,
  canEdit,
  canShare = true,
  hasRestore = false,
  dropdownVisible,
  selectedItems,
  availableActions,
  onSelect,
  onRestoreFromTrash,
  onDelete,
  addSelected,
  selectItem,
  onDropdownActionHandler,
  onDropdownVisibleChange,
}) => {
  const containerClasses = classNames(
    'screenshot-item-overlay',
    styles.overlayContainer,
    selectedItems?.state ? null : styles.hidden,
    addSelected ? styles.spaceBetweenItemsStart : styles.endItemsStart,
  );

  return (
    <div
      className={containerClasses}
      style={{ visibility: dropdownVisible ? 'visible' : undefined }}
      onClick={onSelect}
    >
      {addSelected && (
        <SelectButton
          isSelected={isSelected || false}
          selectedItems={selectedItems}
          selectItem={selectItem as any}
        />
      )}
      {workspace && <div></div>}

      <Dropdown
        getPopupContainer={() =>
          document.getElementById(`scrollableDivItems`) as any
        }
        trigger={['click']}
        overlay={
          <ItemDropdownActions
            onAction={onDropdownActionHandler as any}
            availableActions={availableActions as any}
            canEdit={canEdit}
            canShare={canShare}
            hasRestore={hasRestore}
            workspace={workspace}
          />
        }
        placement="bottomRight"
        onOpenChange={onDropdownVisibleChange}
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
    </div>
  );
};

export default Overlay;

const SelectButton = ({
  isSelected,
  selectedItems,
  selectItem,
}: {
  isSelected: boolean;
  selectedItems?: { items: IEditorVideo[] };
  selectItem: (e: React.MouseEvent) => void;
}) => {
  const iconPath = isSelected ? '/item/checked.svg' : '/item/unchecked.svg';

  return (
    <div className={styles.selectButton}>
      <OverlayButton onClick={selectItem} iconPath={iconPath} size="25px" />
    </div>
  );
};

const OverlayButton: React.FC<{
  size?: string;
  iconPath: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}> = ({ onClick, iconPath, size = '26px' }) => (
  <AppButton bgColor="tw-bg-transparent" onClick={onClick}>
    <AppSvg className="tw-text-white" path={iconPath} size={size} />
  </AppButton>
);
