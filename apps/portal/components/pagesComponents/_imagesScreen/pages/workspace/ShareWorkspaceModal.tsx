import { FC } from 'react';
import classNames from 'classnames';
import { Modal } from 'antd';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import useShareWorkspaceInviteModal from 'hooks/useShareWorkspaceInviteModal';

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
  const { link, copied, setLink, setCopied, primaryButtonClickHandler } =
    useShareWorkspaceInviteModal({ workspace, visible });

  const onModalClose = () => {
    setLink('');
    setCopied(false);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      onCancel={onModalClose}
      footer={
        <div className="tw-flex tw-justify-center tw-items-center tw-mt-8">
          <AppButton
            onClick={primaryButtonClickHandler}
            className={classNames(
              link ? 'tw-px-170px' : 'tw-px-120px',
              copied && 'tw-opacity-80',
            )}
          >
            <AppSvg
              path={copied ? '/common/done.svg' : '/common/copy.svg'}
              size={'24px'}
              className="tw-mr-5px"
            />
            {link ? 'Copy Link' : 'Create Workspace Invite'}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-3 tw-text-2xl tw-font-semibold">
        Share link with the team
      </h2>

      {!!link && (
        <>
          <label>Link to workspace</label>
          <p className="tw-border-black tw-border-b tw-py-5px tw-px-2px tw-mt-5px">
            {link}
          </p>
        </>
      )}
    </Modal>
  );
};

export default ShareWorkspaceModal;
