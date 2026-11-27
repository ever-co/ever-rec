import React from 'react';
import { Modal } from 'antd';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import AppButton from 'components/controls/AppButton';
import { successMessage } from 'app/services/helpers/toastMessages';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSvg from 'components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface IShareVideoModalProps {
  visible: boolean;
  copystate: boolean;
  onCancel: () => void;
  video: IEditorVideo | null;
  copied: () => void;
}

const ShareVideoModal: React.FC<IShareVideoModalProps> = ({
  onCancel,
  visible,
  video,
  copystate,
  copied,
}) => {
  const { t } = useTranslation();
  const editorVideo: IEditorVideo = useSelector(
    (state: RootStateOrAny) => state.panel.editorVideo,
  );
  const copyLinkHandler = async () => {
    const absSharedLink = video?.sharedLink
      ? `${process.env.NEXT_PUBLIC_WEBSITE_URL}/video/shared/${video?.sharedLink}`
      : !video?.sharedLink
        ? `${process.env.NEXT_PUBLIC_WEBSITE_URL}/video/shared/${editorVideo.sharedLink}`
        : null;
    absSharedLink && (await navigator.clipboard.writeText(absSharedLink));
    copied();
    successMessage(t('toasts.copied'));
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-center tw-items-center tw-mt-6">
          <AppButton onClick={copyLinkHandler} full>
            {/* Both files fix their ink (an inline light fill): it follows the button's text. */}
            {copystate ? (
              <AppSvg
                path="/common/done.svg"
                size={'16px'}
                className="[&_path]:!tw-fill-current"
              />
            ) : (
              <AppSvg
                path="/common/copy.svg"
                size="16px"
                className="[&_path]:!tw-fill-current"
              />
            )}
            {t('modals.copyLink')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-4 tw-pr-6 tw-text-lg tw-font-semibold tw-text-foreground">
        {t('modals.shareLink')}
      </h2>
      <label className="tw-text-sm tw-text-muted-foreground">
        {t('modals.linkToVideo')}
      </label>
      <p className="tw-mt-1.5 tw-break-all tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-muted tw-px-3 tw-py-2 tw-text-sm tw-text-foreground">{`${
        process.env.NEXT_PUBLIC_WEBSITE_URL
      }/video/shared/${video?.sharedLink || editorVideo?.sharedLink}`}</p>
    </Modal>
  );
};

export default ShareVideoModal;
