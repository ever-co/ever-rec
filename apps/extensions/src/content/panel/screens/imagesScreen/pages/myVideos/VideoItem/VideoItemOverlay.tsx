import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Dropdown } from 'antd';
import classNames from 'classnames';
import ItemDropdownActions, {
  IDropdownAvailableActions,
} from '../../../components/contextMenu/ItemDropdownActions';
import styles from './VideoItemOverlay.module.scss';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';

interface OverlayProps {
  videoId?: string;
  workspace?: IWorkspace | null;
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
  selectItem: (e: React.MouseEvent) => void;
  onDropdownActionHandler: (action: ItemActionsEnum, e: any) => void;
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
          isSelected={isSelected}
          selectedItems={selectedItems}
          selectItem={selectItem}
        />
      )}
      {workspace && <div></div>}

      <Dropdown
        getPopupContainer={() => {
          return (
            document.getElementById(`scrollableDivItems`) || new HTMLElement()
          );
        }}
        trigger={['click']}
        overlay={
          <ItemDropdownActions
            onAction={onDropdownActionHandler}
            availableActions={availableActions}
            canEdit={canEdit}
            canShare={canShare}
            hasRestore={hasRestore}
            workspace={workspace}
          />
        }
        placement="bottomRight"
        onOpenChange={onDropdownVisibleChange}
      >
        <img
          src="/images/panel/item/options.svg"
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
  isSelected?: boolean;
  selectedItems?: { items: IEditorVideo[] };
  selectItem: (e: React.MouseEvent) => void;
}) => {
  const iconPath = isSelected
    ? 'images/panel/item/checked.svg'
    : 'images/panel/item/unchecked.svg';

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
