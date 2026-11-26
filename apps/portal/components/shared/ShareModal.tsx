import { FC } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-items-center tw-mt-6">
          <AppButton
            onClick={onCopyLink}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            <AppSvg
              path="/common/done.svg"
              size={'16px'}
              className="[&_path]:tw-fill-current"
            />
            {t('modals.copyLink')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-4 tw-text-base tw-font-semibold">
        {t('modals.shareLink')}
      </h2>
      <label className="tw-text-sm tw-text-muted-foreground">
        {t('modals.linkTo', { linkTo: linkTo })}
      </label>
      <p className="tw-mb-0 tw-mt-1 tw-break-all tw-rounded-md tw-border tw-border-solid tw-border-input tw-px-3 tw-py-2 tw-text-sm">
        {link}
      </p>
    </Modal>
  );
};

export default ShareModal;
