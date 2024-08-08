import { FC } from 'react';
import styles from './ModalSaveChangesFooter.module.scss';
import AppButtonSecond from 'components/controls/AppButtonSecond';

interface IProps {
  valid: boolean;
  buttonTitle?: string;
  danger?: boolean;
  ok: () => void;
  close: () => void;
}

const ModalSaveChangesFooter: FC<IProps> = ({
  valid,
  buttonTitle = 'Save changes',
  danger = false,
  ok,
  close,
}) => {
  return (
    <div className={styles.footerContainer}>
      <AppButtonSecond onClick={ok} disabled={!valid} danger={danger}>
        {buttonTitle}
      </AppButtonSecond>

      <span className={styles.cancelLink} onClick={close}>
        Don&apos;t change
      </span>
    </div>
  );
};

export default ModalSaveChangesFooter;
