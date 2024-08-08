import { FC, useEffect, useState } from 'react';
import styles from './ShareItemModal.module.scss';
import { useDispatch } from 'react-redux';
import { Modal } from 'antd';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSpinnerLocal from '@/content/components/containers/appSpinnerLocal/AppSpinnerLocal';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import useGenerateShareLink from '@/content/utilities/hooks/useGenerateShareLink';

interface IProps {
  visible: boolean;
  item: IEditorVideo | null;
  workspaceId?: string;
  onCancel: () => void;
}

const ShareItemModal: FC<IProps> = ({
  visible,
  item,
  workspaceId,
  onCancel,
}) => {
  const dispatch = useDispatch();
  const {
    sharedLink,
    copyLinkHandler,
    getShareableLinkHandler,
    deleteShareLink,
  } = useGenerateShareLink(item, 'video', workspaceId || '', updateVideoState);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareLoadingState, setShareLoadingState] = useState(false);

  // lets not allow the user to spam copy button
  useEffect(() => {
    if (!shareLinkCopied) return;
    const timeout = setTimeout(() => setShareLinkCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [shareLinkCopied]);

  async function updateVideoState(updatedVideo: any) {
    dispatch(PanelAC.updateExplorerVideoData({ video: updatedVideo }));
    dispatch(PanelAC.setEditorVideo({ editorVideo: updatedVideo }));
    // setVideo && setVideo(updatedVideo);
  }

  const generateShareableLink = async () => {
    setShareLoadingState(true);
    await getShareableLinkHandler();
    setShareLoadingState(false);
  };

  const removeSharedLink = async () => {
    setShareLoadingState(true);
    await deleteShareLink();
    setShareLoadingState(false);
  };

  return (
    <Modal
      visible={visible}
      footer={null}
      closable
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      onCancel={onCancel}
    >
      {sharedLink ? (
        <div className="tw-pb-4">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
            <h3 className="tw-font-semibold tw-text-lg tw-mb-2">
              Shareable link:
            </h3>

            <AppButton
              bgColor="tw-bg-red"
              className="tw-pt-0 tw-pb-0 tw-pl-2 tw-pr-2"
              onClick={removeSharedLink}
            >
              <span className="tw-text-xs tw-text-white">Remove</span>
            </AppButton>
          </div>

          <div className="tw-text-md tw-mb-3 tw-break-words">{sharedLink}</div>

          <AppButton
            full
            className={styles.generateLink}
            onClick={async () => {
              !shareLinkCopied && (await copyLinkHandler());
              setShareLinkCopied(true);
            }}
            disabled={shareLinkCopied}
          >
            {shareLoadingState ? (
              <div className={styles.localAppSpinnerWrapper}>
                <AppSpinnerLocal />
              </div>
            ) : (
              <>
                <AppSvg
                  path="images/panel/common/copy.svg"
                  size="24px"
                  className="tw-mr-5px"
                />
                <span>Copy</span>
              </>
            )}
          </AppButton>
        </div>
      ) : (
        <div className="tw-pb-4">
          <h3 className="tw-font-semibold tw-text-lg tw-mb-2">
            Share your video:
          </h3>

          <AppButton
            full
            className={styles.generateLink}
            onClick={generateShareableLink}
          >
            {shareLoadingState ? (
              <div className={styles.localAppSpinnerWrapper}>
                <AppSpinnerLocal />
              </div>
            ) : (
              <span>Generate Shareable Link</span>
            )}
          </AppButton>
        </div>
      )}
    </Modal>
  );
};

export default ShareItemModal;
