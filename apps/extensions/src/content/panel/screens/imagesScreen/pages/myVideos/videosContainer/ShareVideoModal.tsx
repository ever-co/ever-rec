import React from 'react';
import { Modal } from 'antd';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSvg from '@/content/components/elements/AppSvg';

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
  const editorVideo: IEditorVideo = useSelector(
    (state: RootStateOrAny) => state.panel.editorVideo,
  );

  const copyLinkHandler = async () => {
    const absSharedLink = video?.sharedLink
      ? `${process.env.WEBSITE_URL}/video/shared/${video?.sharedLink}`
      : !video?.sharedLink
        ? `${process.env.WEBSITE_URL}/video/shared/${editorVideo.sharedLink}`
        : null;
    absSharedLink && (await navigator.clipboard.writeText(absSharedLink));
    copied();
    successMessage('Copied');
  };

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-center tw-items-center tw-mt-8">
          <AppButton onClick={copyLinkHandler} className="tw-px-170px">
            {copystate ? (
              <AppSvg
                path="images/panel/common/done.svg"
                size={'24px'}
                className="tw-mr-5px"
              />
            ) : (
              <AppSvg
                path="images/panel/common/copy.svg"
                size="24px"
                className="tw-mr-5px"
              />
            )}
            Copy Link
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-3 tw-text-2xl tw-font-semibold">Share link</h2>
      <label>Link to video</label>
      <p className=" tw-border-black tw-border-b tw-py-5px tw-px-2px tw-mt-5px">{`${
        process.env.WEBSITE_URL
      }/video/shared/${video?.sharedLink || editorVideo?.sharedLink}`}</p>
    </Modal>
  );
};

export default ShareVideoModal;
