import React from 'react';
import { Modal } from 'antd';
import IEditorImage from '@/app/interfaces/IEditorImage';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSvg from '@/content/components/elements/AppSvg';
import { ItemType } from '@/app/interfaces/ItemTypes';

interface IShareItemModalProps {
  visible: boolean;
  item: IEditorImage | null;
  itemType?: ItemType | null;
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
  const editorImage: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );

  const publicSite = process.env.WEBSITE_URL;
  const linkFromItem = item?.sharedLink || editorImage?.sharedLink;
  const workspaceParam = isWorkspace ? '?ws=1' : '';

  const shareLink = `${publicSite}/${itemType}/shared/${linkFromItem}${workspaceParam}`;

  const copyLinkHandler = async () => {
    await navigator.clipboard.writeText(shareLink);

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
                size="24px"
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
      <label>Link to item</label>
      <p className="tw-border-black tw-border-b tw-py-5px tw-px-2px tw-mt-5px">
        {shareLink}
      </p>
    </Modal>
  );
};

export default ShareItemModal;
