/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Modal } from 'antd';
import React from 'react';
import styles from './ConfirmModal.module.scss';
import AppSvg from 'components/elements/AppSvg';
import trashIcon from 'public/whiteboards/ContextMenuItems/remove.svg';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOk: () => void;
}
const ConfirmModal: React.FC<Props> = ({ visible, onClose, onOk }) => {
  return (
    <Modal
      className={styles.modal}
      open={visible}
      destroyOnClose={true}
      onCancel={() => {
        onClose();
      }}
      onOk={onOk}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className={styles.button_container}>
          <div onClick={onClose} id={styles.cancel} className={styles.buttons}>
            Cancel
          </div>
          <div
            onClick={() => {
              onClose();
              onOk();
            }}
            id={styles.delete}
            className={styles.buttons}
          >
            Delete
          </div>
        </div>
      }
    >
      <div className="tw-flex tw-items-center tw-gap-2 tw-mb-6">
        <AppSvg
          size="24px"
          path={trashIcon.src}
          className="tw-text-muted-foreground"
        />
        <h2 className={styles.mainHeading}>
          Do you want to delete this whiteboard ?
        </h2>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
