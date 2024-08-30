//@ts-ignore
import styles from './UploadWorkspaceImage.module.scss';
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
        errorHandler({ message: 'File too big' });
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
        errorHandler({ message: 'Image too big.' });
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
      visible={visible}
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
              Use this image as your logo or{' '}
              <span className={styles.actionSpan}>Upload</span> a new image.
            </h5>
          </div>
          <div className={styles.marginDiv}>
            {/* eslint-disable-next-line @typescript-eslint/no-empty-function */}
            <AppButton full={true} onClick={() => {}}>
              Save
            </AppButton>
          </div>
          <div className={styles.marginDiv}>
            <h5 className={styles.headingUploaded}>
              <span className={styles.actionSpan}>Restore</span> previous image
              or logo.
            </h5>
          </div>
        </div>
      ) : (
        // @ts-ignore
        <div {...getRootProps()} ref={rootRef}>
          <input
            {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)}
          />
          <div className={classNames(styles.wrapper, styles.preUploadWrapper)}>
            {isDragActive ? (
              <div className={styles.preUploadWrapper}>
                <h1 className={styles.dropFilesHere}>
                  Drop the files here ...
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
                  Drag &apos;n&apos; drop images here or
                </h3>
                <AppButton
                  onClick={handleClick}
                  full={true}
                  className={styles.appButton}
                >
                  <div>Browse file</div>
                </AppButton>
              </div>
            )}
            <div className={styles.footerDiv}>
              Upload a logo or avatar to your workspace. JPG or PNG format only.
              The maximum file size is 30 KB
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UploadWorkspaceImageModal;
