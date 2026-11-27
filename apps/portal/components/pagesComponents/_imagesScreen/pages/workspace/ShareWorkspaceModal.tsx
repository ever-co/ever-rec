import { FC } from 'react';
import classNames from 'classnames';
import { Modal } from 'antd';
import { Check, Copy } from 'lucide-react';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import AppButton from 'components/controls/AppButton';
import useShareWorkspaceInviteModal from 'hooks/useShareWorkspaceInviteModal';
import { useTranslation } from 'react-i18next';

interface IShareWorkspaceModalProps {
  visible: boolean;
  workspace: IWorkspace;
  onCancel: () => void;
}

const ShareWorkspaceModal: FC<IShareWorkspaceModalProps> = ({
  visible,
  workspace,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { link, copied, setLink, setCopied, primaryButtonClickHandler } =
    useShareWorkspaceInviteModal({ workspace, visible });
  const Icon = copied ? Check : Copy;

  const onModalClose = () => {
    setLink('');
    setCopied(false);
    onCancel();
  };

  return (
    <Modal
      open={visible}
      onCancel={onModalClose}
      footer={
        <div className="tw-flex tw-justify-end tw-items-center tw-mt-6">
          <AppButton
            onClick={primaryButtonClickHandler}
            className={classNames(
              'tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0',
              copied && 'tw-opacity-80',
            )}
          >
            <Icon className="tw-size-4 tw-shrink-0" aria-hidden="true" />
            {link ? t('modals.copyLink') : t('workspace.createWorkspaceInvite')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-0 tw-pr-6 tw-text-base tw-font-semibold tw-text-foreground">
        {t('modals.shareLinkTeam')}
      </h2>

      {!!link && (
        <>
          <label className="tw-mt-4 tw-block tw-text-sm tw-font-medium tw-text-foreground">
            {t('workspace.linkToWorkspace')}
          </label>
          <p className="tw-mt-2 tw-mb-0 tw-h-10 tw-truncate tw-rounded-md tw-border tw-border-solid tw-border-input tw-px-3 tw-text-sm tw-leading-[38px] tw-text-foreground">
            {link}
          </p>
        </>
      )}
    </Modal>
  );
};

export default ShareWorkspaceModal;
