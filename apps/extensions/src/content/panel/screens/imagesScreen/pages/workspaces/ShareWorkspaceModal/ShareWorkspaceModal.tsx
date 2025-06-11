import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { Modal } from 'antd';
import { useDispatch } from 'react-redux';
import { successMessage } from '@/app/services/helpers/toastMessages';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import useShareWorkspaceInviteModal from '@/content/panel/hooks/useShareWorkspaceInviteModal';
import { useTranslation } from 'react-i18next';

interface IShareWorkspaceModalProps {
  visible: boolean;
  workspace: IWorkspace;
  onCancel: () => void;
}

const ShareWorkspaceModal: React.FC<IShareWorkspaceModalProps> = ({
  visible,
  workspace,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { link, setLink, copied, setCopied, primaryButtonClickHandler } =
    useShareWorkspaceInviteModal({ workspace, visible });

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
        <div className="tw-flex tw-justify-center tw-items-center tw-mt-8">
          <AppButton
            onClick={primaryButtonClickHandler}
            className={classNames(
              link ? 'tw-px-170px' : 'tw-px-120px',
              copied && 'tw-opacity-80',
            )}
          >
            <AppSvg
              path={
                copied
                  ? 'images/panel/common/done.svg'
                  : 'images/panel/common/copy.svg'
              }
              size={'24px'}
              className="tw-mr-5px"
            />
            {link ? t('modals.copyLink') : t('workspace.createWorkspaceInvite')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-3 tw-text-2xl tw-font-semibold">
        {t('modals.shareLinkTeam')}
      </h2>
      {!!link && (
        <>
          <label>{t('workspace.linkToWorkspace')}</label>
          <p className="tw-border-black tw-border-b tw-py-5px tw-px-2px tw-mt-5px">
            {link}
          </p>
        </>
      )}
    </Modal>
  );
};

export default ShareWorkspaceModal;
