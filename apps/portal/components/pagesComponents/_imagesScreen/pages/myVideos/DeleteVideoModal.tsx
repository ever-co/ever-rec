import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { useTranslation } from 'react-i18next';

interface IDeleteVideoModalProps {
  visible: boolean;
  onOk: (video: IEditorVideo | null) => void;
  onCancel: () => void;
  video: IEditorVideo | null;
}

const DeleteVideoModal: React.FC<IDeleteVideoModalProps> = ({
  onOk,
  onCancel,
  visible,
  video,
}) => {
  const onOkHandler = () => {
    onOk(video);
  };

  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton onClick={onCancel} outlined>
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            // disabled={!valid}
          >
            {t('unique.deleteVideo')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-pe-6 tw-text-base tw-font-semibold tw-text-foreground">
        {t('modals.deleteVideoInfo')}{' '}
      </h2>
    </Modal>
  );
};

export default DeleteVideoModal;
