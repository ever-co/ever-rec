import { Dropdown } from 'antd';
import classNames from 'classnames';
import { Check, MoreHorizontal } from 'lucide-react';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { IDropdownAvailableActions } from 'components/pagesComponents/_imagesScreen/components/contextMenu/ItemDropdownActions';
import AppButton from 'components/controls/AppButton';
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
        <div
          role="img"
          aria-label="options"
          className={styles.optionsButton}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal aria-hidden="true" />
        </div>
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
  return (
    <div className={styles.selectButton}>
      <OverlayButton onClick={selectItem} checked={isSelected} />
    </div>
  );
};

// The button sits over media: its hover ground is a light veil, not the theme's hover surface.
const OverlayButton: React.FC<{
  checked: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}> = ({ onClick, checked }) => (
  <AppButton
    bgColor="tw-bg-transparent hover:tw-bg-[hsl(var(--on-overlay)/0.16)]"
    twPadding="tw-p-1.5"
    onClick={onClick}
  >
    <span
      className={classNames(styles.checkbox, checked && styles.checkboxChecked)}
    >
      {checked && <Check strokeWidth={3} aria-hidden="true" />}
    </span>
  </AppButton>
);
