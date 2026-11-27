import React from 'react';
import { Modal } from 'antd';
import { RootStateOrAny, useSelector } from 'react-redux';
import { ItemType } from 'app/interfaces/ItemType';
import AppSvg from 'components/elements/AppSvg';
import AppButton from 'components/controls/AppButton';
import IEditorImage from 'app/interfaces/IEditorImage';
import {
  errorMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { useTranslation } from 'react-i18next';

interface IShareItemModalProps {
  visible: boolean;
  item: IEditorImage | null;
  itemType?: ItemType;
  isWorkspace?: boolean;
  copystate: boolean;
  copied: () => void;
  onCancel: () => void;
}

const ShareItemModal: React.FC<IShareItemModalProps> = ({
  visible,
  item,
  itemType = 'image',
  isWorkspace = false,
  copystate,
  copied,
  onCancel,
}) => {
  const { t } = useTranslation();
  const editorImage: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );

  const publicSite = process.env.NEXT_PUBLIC_WEBSITE_URL;
  const linkFromItem = item?.sharedLink || editorImage?.sharedLink;
  const workspaceParam = isWorkspace ? '?ws=1' : '';

  const shareLink = `${publicSite}/${itemType}/shared/${linkFromItem}${workspaceParam}`;

  const copyLinkHandler = async () => {
    // The clipboard can be refused (no permission, insecure context). Only report
    // success when the link was really written.
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch (e) {
      errorMessage(t('hooks.toasts.shareLinkCopyError'));
      return;
    }

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
                size="16px"
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
      <h2 className="tw-mb-4 tw-pe-6 tw-text-base tw-font-semibold tw-text-foreground">
        {t('modals.shareLink')}
      </h2>
      <label className="tw-text-sm tw-text-muted-foreground">
        {t('modals.linkToItem')}
      </label>
      <p className="tw-mt-1.5 tw-break-all tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-muted tw-px-3 tw-py-2 tw-text-sm tw-text-foreground">
        {shareLink}
      </p>
    </Modal>
  );
};

export default ShareItemModal;
