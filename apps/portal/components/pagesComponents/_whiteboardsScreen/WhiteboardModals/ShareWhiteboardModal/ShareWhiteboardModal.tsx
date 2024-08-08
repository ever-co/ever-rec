import { FC } from 'react';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import {
  errorMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import ShareModal from 'components/shared/ShareModal';

export const copyWhiteboardToClipboard = async (
  whiteboard: IWhiteboard,
  showSucessNotification = true,
) => {
  try {
    await navigator.clipboard.writeText(
      `${process.env.NEXT_PUBLIC_WEBSITE_URL}/whiteboard/${whiteboard.id}?s=1`,
    );
    showSucessNotification && successMessage('Link copied.');
  } catch (e) {
    errorMessage('Could not copy link.');
  }
};

interface IProps {
  item: IWhiteboard | null;
  visible: boolean;
  onCancel: () => void;
}

const ShareWhiteboardModal: FC<IProps> = ({ item, visible, onCancel }) => {
  const shareLink =
    item && `${process.env.NEXT_PUBLIC_WEBSITE_URL}/whiteboard/${item.id}?s=1`;

  const copyLinkHandler = async () => {
    if (!shareLink) return;

    await copyWhiteboardToClipboard(item);
  };

  return (
    <ShareModal
      link={shareLink}
      linkTo="whiteboard"
      visible={visible}
      onCopyLink={copyLinkHandler}
      onCancel={onCancel}
    />
  );
};

export default ShareWhiteboardModal;
