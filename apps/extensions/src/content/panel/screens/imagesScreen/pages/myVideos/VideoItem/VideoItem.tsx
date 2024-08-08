import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import classNames from 'classnames';
import styles from './VideoItem.module.scss';
import '../videosContainer/video.scss';
import { IWorkspace, IWorkspaceVideo } from '@/app/interfaces/IWorkspace';
import ItemFooter from '../../../components/itemFooter/ItemFooter';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { IDropdownAvailableActions } from '../../../components/contextMenu/ItemDropdownActions';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import useInitImageVideoItem from '@/content/utilities/hooks/useInitImageVideoItem';
import { defaultAvailableActions } from '../../../components/contextMenu/containerDropdownActions';
import Overlay from './VideoItemOverlay';
import Thumbnail from '../Thumbnail/Thumbnail';
import PlayButton from '../PlayButton/PlayButton';
import VideoItemWrapper from './VideoItemWrapper';
import ItemAuthor from '../ItemFooter/ItemAuthor';

interface IVideoItemProps {
  id?: number;
  user: { name?: string | null; photoURL?: string | null };
  type: 'image' | 'video';
  workspace?: IWorkspace | null;
  video: IEditorVideo | IWorkspaceVideo;
  canEdit?: boolean;
  canShare?: boolean;
  isDraggable?: boolean;
  hasRestore?: boolean;
  availableActions?: IDropdownAvailableActions;
  selectedItems?: {
    state: boolean;
    items: (IEditorVideo | IWorkspaceVideo)[];
  };
  addSelected?: Dispatch<
    SetStateAction<{ state: boolean; items: IEditorVideo[] }>
  >;
  updateTitle: (title: string) => void;
  onSelect: () => void;
  onDelete: () => void;
  onRestoreFromTrash?: () => void;
  onDropdownAction: (action: ItemActionsEnum, e: MouseEvent) => void;
  onDropdownVisibleChange: (visible: boolean) => void;
}

const VideoItem: React.FC<IVideoItemProps> = ({
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

  const selectItem = () => {
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

  const onDropdownActionHandler = (action: ItemActionsEnum, e: any) => {
    setDropdownVisible(false);
    onDropdownAction(action, e);
  };

  const dropdownVisibleChangeHandler = (visible: boolean) => {
    setDropdownVisible(visible);
    onDropdownVisibleChange(visible);
  };

  let thumbnailUrl = null;
  let views = 0;

  if (video?.dbData) {
    thumbnailUrl = video.dbData?.streamData?.thumbnailUrl;
    views = Array.isArray(video?.dbData?.views)
      ? video?.dbData?.views.length
      : video?.dbData?.views ?? 0;
  }

  return (
    <>
      <VideoItemWrapper
        videoId={video?.dbData?.id}
        isDraggable={isDraggable}
        isSelected={isSelected}
        dropdownVisible={dropdownVisible}
        selectedItems={selectedItems}
        onDragStart={(ev: React.DragEvent) => {
          ev.dataTransfer.effectAllowed = 'move';
          video.dbData?.id && ev.dataTransfer.setData('id', video.dbData?.id);
        }}
        onClick={onSelect}
      >
        <div style={{ position: 'relative', maxHeight: '176px' }}>
          {type === 'video' ? (
            <>
              <Thumbnail
                thumbnailUrl={thumbnailUrl}
                videoUrl={video.url}
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
            videoId={video?.dbData?.id}
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
            name={user?.name || null}
            photoURL={user?.photoURL || null}
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
