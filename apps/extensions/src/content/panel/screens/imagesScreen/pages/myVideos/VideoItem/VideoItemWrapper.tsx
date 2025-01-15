import classNames from 'classnames';
import * as styles from './VideoItemWrapper.module.scss';
import { memo } from 'react';

// Provide a more specific type for selectedItems
interface SelectedItems {
  items: Array<any>; // Replace 'any' with the actual type of items
}

interface VideoItemWrapperProps {
  itemId?: string | number;
  videoId?: string;
  isDraggable: boolean;
  isSelected: boolean;
  dropdownVisible: boolean;
  selectedItems?: SelectedItems;
  children: React.ReactNode;
  onDragStart?: (ev: React.DragEvent<Element>) => void;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
}

const VideoItemWrapper: React.FC<VideoItemWrapperProps> = ({
  itemId,
  videoId,
  isDraggable,
  isSelected,
  dropdownVisible,
  selectedItems,
  children,
  onDragStart,
  onClick,
}) => (
  <div
    id={`video_${videoId || itemId}`}
    draggable={isDraggable}
    className={classNames(
      'screenshot-item',
      styles.wrapper,
      isSelected && selectedItems?.items.length !== 0
        ? styles.selected
        : styles.defaultBorder,
      dropdownVisible && styles.selected,
    )}
    onDragStart={onDragStart}
    onClick={onClick}
  >
    {children}
  </div>
);

export default memo(VideoItemWrapper);
