import { FC } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';

interface IShareModalProps {
  link: string;
  linkTo: string;
  visible: boolean;
  onCopyLink: () => void;
  onCancel: () => void;
}

const ShareModal: FC<IShareModalProps> = ({
  link,
  linkTo,
  visible,
  onCancel,
  onCopyLink,
}) => {
  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-center tw-items-center tw-mt-8">
          <AppButton onClick={onCopyLink} className="tw-px-170px">
            <AppSvg
              path="/common/done.svg"
              size={'24px'}
              className="tw-mr-5px"
            />
            Copy Link
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-3 tw-text-2xl tw-font-semibold">Share link</h2>
      <label>Link to {linkTo}:</label>
      <p className="tw-border-black tw-border-b tw-py-5px tw-px-2px tw-mt-5px">
        {link}
      </p>
    </Modal>
  );
};

export default ShareModal;
