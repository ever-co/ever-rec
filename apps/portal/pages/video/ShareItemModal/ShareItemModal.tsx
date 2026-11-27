import { FC, useEffect, useMemo, useState } from 'react';
import { buildVideoEmbedCode, getVideoEmbedUrl } from 'app/utilities/embed';
import { errorHandler } from 'app/services/helpers/errors';
import { successMessage } from 'app/services/helpers/toastMessages';
import styles from './ShareItemModal.module.scss';
import AppSpinnerLocal from 'components/containers/appSpinnerLocal/AppSpinnerLocal';
import AppButton from 'components/controls/AppButton';
import { IoCopyOutline } from 'react-icons/io5';
import useGenerateShareLink from 'hooks/useGenerateShareLink';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { useDispatch } from 'react-redux';
import { Modal } from 'antd';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { useTranslation } from 'react-i18next';

interface IProps {
  visible: boolean;
  item: IEditorVideo;
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
  const { t } = useTranslation();
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

  const embedCode = useMemo(() => {
    const embedUrl = sharedLink ? getVideoEmbedUrl(sharedLink) : null;
    return embedUrl ? buildVideoEmbedCode(embedUrl, item?.dbData?.title) : null;
  }, [sharedLink, item?.dbData?.title]);

  const copyEmbedCode = async () => {
    if (!embedCode) return;

    try {
      await window.navigator.clipboard.writeText(embedCode);
      successMessage(t('page.image.embedCodeCopied'));
    } catch (e) {
      errorHandler(new Error(t('hooks.toasts.shareLinkCopyError')));
    }
  };

  const removeSharedLink = async () => {
    setShareLoadingState(true);
    await deleteShareLink();
    setShareLoadingState(false);
  };

  return (
    <Modal open={visible} footer={null} closable onCancel={onCancel}>
      {sharedLink ? (
        <div className="tw-pb-8">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-mb-3 tw-pr-6">
            <h3 className="tw-font-semibold tw-text-base tw-mb-0">
              {t('page.image.shareableLink')}
            </h3>

            <AppButton
              outlined
              twTextColor="tw-text-destructive-text"
              className="tw-flex tw-h-8 tw-items-center tw-justify-center tw-px-3 tw-py-0"
              onClick={removeSharedLink}
            >
              <span className="tw-text-xs">{t('page.image.remove')}</span>
            </AppButton>
          </div>

          <div className="tw-mb-4 tw-break-all tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-muted tw-px-3 tw-py-2 tw-text-sm">
            {sharedLink}
          </div>

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
                <IoCopyOutline size={16} />
                {t('page.image.copy')}
              </>
            )}
          </AppButton>

          {embedCode && (
            <AppButton
              full
              outlined
              className={`${styles.generateLink} tw-mt-2`}
              onClick={copyEmbedCode}
            >
              {t('page.image.copyEmbedCode')}
            </AppButton>
          )}
        </div>
      ) : (
        <div className="tw-pb-8">
          <h3 className="tw-font-semibold tw-text-base tw-mb-4 tw-pr-6">
            {t('page.image.shareYourVideo')}
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
              <span>{t('page.image.generateShareableLink')}</span>
            )}
          </AppButton>
        </div>
      )}
    </Modal>
  );
};

export default ShareItemModal;
