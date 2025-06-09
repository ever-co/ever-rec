//@ts-ignore
import * as styles from './UploadWorkspaceImage.module.scss';
import {
  ChangeEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { errorHandler } from '@/app/services/helpers/errors';
import { Modal } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import classNames from 'classnames';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOk: (file: File) => void;
}
const UploadWorkspaceImageModal: React.FC<Props> = ({
  visible,
  onClose,
  onOk,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const activeWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const { rootRef, acceptedFiles, getRootProps, getInputProps, isDragActive } =
    useDropzone({
      noClick: true,
    });
  const uploadedImageElementRef = useRef<HTMLImageElement>(null);
  const hiddenInputField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (acceptedFiles.length > 0) {
      if (acceptedFiles[0].size > 30000) {
        errorHandler({ message: t('ext.fileTooBig') });
      } else {
        setFile(acceptedFiles[0]);
      }
    }
  }, [acceptedFiles]);

  useEffect(() => {
    if (file && uploadedImageElementRef.current) {
      uploadedImageElementRef.current.src = URL.createObjectURL(file);
    }
  }, [uploadedImageElementRef.current, file]);

  const handleFileUploadButton = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const uploadedFile = e.target.files[0];
      if (uploadedFile.size > 30000) {
        errorHandler({ message: t('ext.imageTooBig') });
      } else {
        setFile(uploadedFile);
      }
    }
  };

  const handleClick = (e: SyntheticEvent) => {
    hiddenInputField.current && hiddenInputField.current.click();
  };

  const handleSubmit = () => {
    file && onOk(file);
  };

  return (
    <Modal
      className={styles.modal}
      open={visible}
      onCancel={onClose}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={<div></div>}
    >
      {file ? (
        <div className={classNames(styles.wrapper, styles.afterUploadWrapper)}>
          <div className={styles.uploadedImageWrapper}>
            <img
              src="#"
              alt="uploaded logo"
              ref={uploadedImageElementRef}
              className={styles.uploadedImage}
            />
          </div>
          <div className={styles.marginDiv}>
            <h5 className={styles.headingUploaded}>
              {t('workspace.useAsLogo')}{' '}
              <span className={styles.actionSpan}>{t('workspace.upload')}</span>
              {t('workspace.aNewImage')}
            </h5>
          </div>
          <div className={styles.marginDiv}>
            <AppButton onClick={() => console.log('TODO: save')} full={true}>
              {t('common.save')}
            </AppButton>
          </div>
          <div className={styles.marginDiv}>
            <h5 className={styles.headingUploaded}>
              <span className={styles.actionSpan}>
                {t('common.fileActions.restore')}
              </span>{' '}
              {t('workspace.previousImageOrLogo')}{' '}
            </h5>
          </div>
        </div>
      ) : (
        // @ts-ignore
        <div {...getRootProps()} ref={rootRef}>
          <input {...getInputProps()} />
          <div className={classNames(styles.wrapper, styles.preUploadWrapper)}>
            {isDragActive ? (
              <div className={styles.preUploadWrapper}>
                <h1 className={styles.dropFilesHere}>
                  {t('workspace.dropFiles')}
                </h1>
              </div>
            ) : (
              <div className={styles.inputWrapper}>
                <input
                  type="file"
                  hidden={true}
                  onChange={handleFileUploadButton}
                  ref={hiddenInputField}
                />
                <AppSvg
                  path="/common/Drag-images-picture.svg"
                  className={styles.imageSVG}
                />
                <h3 className={styles.dragNDrop}>
                  {t('workspace.dragAndDropImagesHereOr')}
                </h3>
                <AppButton
                  onClick={handleClick}
                  full={true}
                  className={styles.appButton}
                >
                  <div>{t('workspace.browseFile')}</div>
                </AppButton>
              </div>
            )}
            <div className={styles.footerDiv}>
              {t('workspace.logoDescription')}{' '}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UploadWorkspaceImageModal;
