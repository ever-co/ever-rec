import {
  Dispatch,
  DragEvent,
  FC,
  SetStateAction,
  useMemo,
  useState,
} from 'react';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import classNames from 'classnames';
import useInitImageVideoItem from 'hooks/useInitImageVideoItem';
import ItemFooter from 'components/pagesComponents/_imagesScreen/components/ItemFooter';
import { IDropdownAvailableActions } from 'components/pagesComponents/_imagesScreen/components/contextMenu/ItemDropdownActions';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import { defaultAvailableActions } from 'components/pagesComponents/_imagesScreen/components/contextMenu/containerDropdownActions';
import styles from './VideoItem.module.scss';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import Thumbnail from './Thumbnail';
import PlayButton from './PlayButton';
import Overlay from './VideoItemOverlay';
import VideoItemWrapper from './VideoItemWrapper';
import ItemAuthor from './ItemAuthor';
import Image from 'next/legacy/image';

interface IVideoItemProps {
  id?: number;
  user: { name: string; photoURL: string };
  workspace?: IWorkspace;
  type: 'image' | 'video';
  video: IEditorVideo;
  canEdit?: boolean;
  canShare?: boolean;
  isDraggable?: boolean;
  hasRestore?: boolean;
  availableActions?: IDropdownAvailableActions;
  selectedItems?: {
    state: boolean;
    items: IEditorVideo[];
  };
  addSelected?: Dispatch<
    SetStateAction<{ state: boolean; items: IEditorVideo[] }>
  >;
  updateTitle: (title: string) => void;
  onDelete: () => void;
  onSelect: () => void;
  onRestoreFromTrash?: () => void;
  onDropdownAction: (action: ItemActionsEnum, e: MouseEvent) => void;
  onDropdownVisibleChange: (visible: boolean) => void;
}

const VideoItem: FC<IVideoItemProps> = ({
  id,
  user,
  workspace,
  type,
  video,
  canEdit,
  canShare = true,
  isDraggable = true,
  hasRestore = false,
  availableActions = defaultAvailableActions,
  addSelected,
  selectedItems,
  updateTitle,
  onDelete,
  onSelect,
  onRestoreFromTrash,
  onDropdownAction,
  onDropdownVisibleChange,
}) => {
  const canEditTitle = useMemo(
    () => (workspace && canEdit) || !workspace,
    [workspace, canEdit],
  );
  const { titleContainer, created } = useInitImageVideoItem({
    updateTitle,
    item: video,
    forSinglePage: false,
    canEditTitle,
  });
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelected =
    selectedItems?.items.some((item) => item.dbData?.id === video.dbData?.id) ??
    false;

  const selectItem = (e: React.MouseEvent) => {
    if (addSelected && video && selectedItems) {
      const selected = isSelected;
      const newItems = selected
        ? selectedItems.items.filter(
            (item) => item.dbData?.id !== video.dbData?.id,
          )
        : [...selectedItems.items, video];

      addSelected({ state: newItems.length > 0, items: newItems });
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

  let thumbnailUrl: string | null = null;
  let views = 0;
  if (video?.dbData) {
    thumbnailUrl = video.dbData?.streamData?.thumbnailUrl || null;
    views = Array.isArray(video?.dbData?.views)
      ? video?.dbData?.views.length
      : (video?.dbData?.views ?? 0);
  }

  return (
    <>
      <VideoItemWrapper
        videoId={video?.dbData?.id || undefined}
        isDraggable={isDraggable}
        isSelected={isSelected}
        dropdownVisible={dropdownVisible}
        selectedItems={selectedItems as any}
        onDragStart={(ev: DragEvent) => {
          ev.dataTransfer.effectAllowed = 'move';
          video.dbData?.id && ev.dataTransfer.setData('id', video.dbData?.id);
        }}
        onClick={onSelect}
      >
        <div style={{ position: 'relative', maxHeight: '176px' }}>
          {type === 'video' ? (
            <>
              <Thumbnail
                thumbnailUrl={thumbnailUrl || ''}
                videoUrl={video.url || ''}
                loading={loading}
                setLoading={setLoading}
              />
              <PlayButton />
              {video.dbData?.duration && (
                <div className={classNames(styles.label)}>
                  {video.dbData?.duration}
                </div>
              )}
            </>
          ) : (
            <div className={styles.imageContainer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video?.url} alt="" />
            </div>
          )}

          <Overlay
            onRestoreFromTrash={onRestoreFromTrash}
            addSelected={addSelected}
            selectItem={selectItem}
            isSelected={isSelected}
            selectedItems={selectedItems}
            workspace={workspace}
            onDropdownActionHandler={onDropdownActionHandler}
            availableActions={availableActions}
            canEdit={canEdit}
            canShare={canShare}
            hasRestore={hasRestore}
            videoId={video?.dbData?.id || undefined}
            onDelete={onDelete}
            dropdownVisible={dropdownVisible}
            onDropdownVisibleChange={dropdownVisibleChangeHandler}
            onSelect={onSelect}
          ></Overlay>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className={styles.itemFooter}
          draggable={false}
        >
          <div className={styles.container}>
            <div className={styles.title}>{titleContainer}</div>
          </div>

          <ItemAuthor
            name={user?.name}
            photoURL={user?.photoURL}
            created={created}
          />

          <ItemFooter
            views={views}
            likes={video?.dbData?.likes ? video.dbData?.likes : []}
            comments={video?.dbData?.commentsLength || 0}
          />
        </div>
      </VideoItemWrapper>
    </>
  );
};

export default VideoItem;
