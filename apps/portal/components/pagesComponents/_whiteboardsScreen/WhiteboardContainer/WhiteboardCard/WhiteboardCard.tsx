/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @next/next/link-passhref */
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import styles from './WhiteboardCard.module.scss';
import { UserOutlined } from '@ant-design/icons';
import { Avatar, Tooltip } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import checkIcon from 'public/whiteboards/check.svg';
import defaultBackground from 'public/common/Thumbnail.svg';
import Link from 'next/link';
import {
  IMenuItem,
  EWhiteboardCardMenuItems as EMenuItems,
} from '../whiteboardCardMenuItems';
import {
  errorMessage,
  infoMessage,
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import RenameModal from '../../WhiteboardModals/RenameModal/RenameModal';
import {
  deleteWhiteboard,
  favoriteWhiteboard,
  moveWhiteboardToTrash,
  renameWhiteboard,
  shareWhiteboard,
} from 'app/services/whiteboards';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import WhiteboardAC from 'app/store/whiteboard/actions/WhiteboardAC';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import router from 'next/router';
import ConfirmModal from '../../WhiteboardModals/ConfirmModal/ConfirmModal';
import WhiteboardCardTeamGroup from './WhiteboardCardTeamGroup';
import WhiteboardCardFavoriteIcon from './WhiteboardCardFavoriteIcon';
import WhiteboardCardMenu from './WhiteboardCardMenu';
import ShareWhiteboardModal, {
  copyWhiteboardToClipboard,
} from '../../WhiteboardModals/ShareWhiteboardModal/ShareWhiteboardModal';

interface IWhiteboardCardProps {
  whiteboard: IWhiteboard;
  team: Array<{ name: string; color: string }>;
  isTrash?: boolean;
}

const WhiteboardCard: React.FC<IWhiteboardCardProps> = ({
  whiteboard,
  team,
  isTrash = false,
}) => {
  const dispatch = useDispatch();
  const whiteboards: IWhiteboard[] = useSelector(
    (state: RootStateOrAny) => state.whiteboard.whiteboards,
  );
  const [favorite, setFavorite] = useState(whiteboard.favorite);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    favoriteWhiteboardHandler(favorite);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorite]);

  const mapNewWhiteboards = (newWhiteBoard: IWhiteboard) => {
    return whiteboards.map((whiteboard: IWhiteboard) => {
      if (whiteboard.id === newWhiteBoard.id) {
        return newWhiteBoard;
      }

      return whiteboard;
    });
  };

  const renameWboard = async (name: string) => {
    setShowRenameModal(false);
    const id = loadingMessage();
    const data = await renameWhiteboard(whiteboard.id, name);

    if (!data)
      return updateMessage(
        id,
        'There was a problem with renaming a whiteboard.',
        'error',
      );

    const newWhiteboards = mapNewWhiteboards(data);

    dispatch(WhiteboardAC.setWhiteboards({ whiteboards: newWhiteboards }));
    updateMessage(id, 'Whiteboard successfully renamed', 'success');
  };

  const shareWboard = async (onlyCopy = false) => {
    if (!whiteboard.isPublic) {
      const id = loadingMessage();
      const data = await shareWhiteboard(whiteboard.id);

      if (!data)
        return updateMessage(
          id,
          'There was a problem with sharing your whiteboard.',
          'error',
        );

      const newWhiteboards = mapNewWhiteboards(data);

      dispatch(WhiteboardAC.setWhiteboards({ whiteboards: newWhiteboards }));
      updateMessage(id, 'Share successful. Link copied.', 'success');
    }

    await copyWhiteboardToClipboard(whiteboard, whiteboard.isPublic);

    !onlyCopy && setShowShareModal(true);
  };

  const moveWhiteboardToBin = async (trash: boolean) => {
    const id = loadingMessage();
    const data = await moveWhiteboardToTrash(whiteboard.id, trash);

    if (!data)
      return updateMessage(
        id,
        'Error while moving whiteboard to bin.',
        'error',
      );

    const newWhiteboards = mapNewWhiteboards(data);

    dispatch(WhiteboardAC.setWhiteboards({ whiteboards: newWhiteboards }));
    updateMessage(id, 'Whiteboard moved to bin', 'success');
  };

  const favoriteWhiteboardHandler = async (favorite: boolean) => {
    const data = await favoriteWhiteboard(whiteboard.id, favorite);

    if (!data) {
      return errorMessage('Error while trying to favorite your whiteboard.');
    }

    const newWhiteboards = mapNewWhiteboards(data);

    dispatch(WhiteboardAC.setWhiteboards({ whiteboards: newWhiteboards }));
  };

  // Trash only
  const restoreWhiteboard = async (toTrash: boolean) => {
    const id = loadingMessage();
    const data = await moveWhiteboardToTrash(whiteboard.id, toTrash);

    if (!data)
      return updateMessage(id, 'Error while restoring whiteboard.', 'error');

    const newWhiteboards = mapNewWhiteboards(data);

    dispatch(WhiteboardAC.setWhiteboards({ whiteboards: newWhiteboards }));
    updateMessage(id, 'Successfully restored whiteboard!', 'success');
  };

  // Trash only
  const deleteWBoard = async () => {
    const id = loadingMessage();
    const data = await deleteWhiteboard(whiteboard.id);

    if (!data)
      return updateMessage(id, 'Error while removing a whiteboard.', 'error');

    const newWhiteboards: IWhiteboard[] = whiteboards.filter(
      (whiteboard) => whiteboard.id !== data.id,
    );

    dispatch(WhiteboardAC.setWhiteboards({ whiteboards: newWhiteboards }));
    updateMessage(id, 'Successfully removed the whiteboard!', 'success');
  };

  const handleMenuItemClick = (item: IMenuItem, whiteboard: IWhiteboard) => {
    switch (item.title) {
      case EMenuItems.OPEN_IN_NEW_TAB:
        break;
      case EMenuItems.OPEN:
        router.push(`/whiteboard/${whiteboard.id}`);
        break;
      case EMenuItems.COPY_LINK:
        shareWboard(true);
        break;
      case EMenuItems.FAVORITES_ADD:
      case EMenuItems.FAVORITES_REMOVE:
        setFavorite((prev) => !prev);
        break;
      case EMenuItems.SHARE:
        shareWboard();
        break;
      case EMenuItems.RENAME:
        setShowRenameModal(true);
        break;
      case EMenuItems.REMOVE_TO_BIN:
        moveWhiteboardToBin(true);
        break;
      //  Trash only options
      case EMenuItems.RESTORE:
        restoreWhiteboard(false);
        break;
      case EMenuItems.REMOVE_FOREVER:
        setShowDeleteModal(true);
        break;
      default:
        infoMessage('Coming soon...');
        break;
    }
  };

  return (
    <div className={styles.whiteboardCard}>
      <div
        style={{
          backgroundImage: whiteboard.thumbnail
            ? `url(${whiteboard.thumbnail})`
            : `url(${defaultBackground.src})`,
          backgroundSize: whiteboard.thumbnail ? 'cover' : '45%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
        className={styles.whiteboardCardThumbnail}
      >
        <div className={styles.whiteboardCardThumbnailOverlayTop}>
          <div>
            <AppSvg size="27px" path={checkIcon.src} />
          </div>

          <div>
            <WhiteboardCardFavoriteIcon
              isTrash={isTrash}
              favorite={favorite}
              setFavorite={setFavorite}
            />

            <WhiteboardCardMenu
              isTrash={isTrash}
              favorite={favorite}
              whiteboard={whiteboard}
              handleMenuItemClick={handleMenuItemClick}
            />
          </div>
        </div>

        <div className={styles.whiteboardCardThumbnailOverlayBottom}>
          <div>Design</div>
          <WhiteboardCardTeamGroup team={team} />
        </div>
      </div>

      <div className={styles.whiteboardCardDescription}>
        <Link href={`/whiteboard/${whiteboard.id}`}>
          <h1>{whiteboard.name}</h1>
        </Link>

        <div>
          <Tooltip title="Ant User" placement="top">
            <Avatar
              size={26}
              style={{ backgroundColor: '#87d068', marginRight: '0.5rem' }}
              icon={<UserOutlined />}
            />
          </Tooltip>
          Edited 2 hours ago by Ant User
        </div>
      </div>

      <RenameModal
        visible={showRenameModal}
        onOk={(name: string) => {
          renameWboard(name);
        }}
        onCancel={() => {
          setShowRenameModal(false);
        }}
      />

      <ShareWhiteboardModal
        item={whiteboard}
        visible={showShareModal}
        onCancel={() => setShowShareModal(false)}
      />

      <ConfirmModal
        visible={showDeleteModal}
        onOk={deleteWBoard}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

export default WhiteboardCard;
