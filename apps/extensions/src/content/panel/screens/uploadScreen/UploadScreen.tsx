import React, {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import browser from '@/app/utilities/browser';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import { fileGetBase64 } from '@/app/utilities/images';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { useNavigate } from 'react-router';
import store from '@/app/store/panel';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { warnMessage } from '@/app/services/helpers/toastMessages';
import * as styles from './UploadScreen.module.scss';
import classNames from 'classnames';

const fileType = ['image/png', 'image/jpeg', 'image/jpg'];

const UploadScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileUploader = useRef<HTMLInputElement>(null);
  const editorImage: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );
  const [loading, setLoading] = useState(false);

  const sendBase64ImageToEditor = async (file: File, fileTitle: string) => {
    setLoading(true);
    const imageBase64 = await fileGetBase64(file);

    if (typeof imageBase64 == 'string') {
      store.dispatch(
        PanelAC.setUnsavedBase64({
          unsavedBase64: imageBase64,
          capturedTitle: fileTitle,
        }),
      );

      store.dispatch(PanelAC.setFromExistedImage(true));

      navigate(panelRoutes.edit.path);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (editorImage) {
      store.dispatch(PanelAC.clearEditorImage());
    }
  }, [editorImage]);

  const changeUploadFileHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      const fileTitle = event.target.files[0].name;
      const file = event.target.files[0];
      if (file && fileTitle) {
        if (!fileType.includes(file?.type)) {
          return warnMessage('This file type is not supported.');
        }

        sendBase64ImageToEditor(file, fileTitle);
      }
    }
  };

  const onDrop = async (e: DragEvent<HTMLDivElement> | undefined) => {
    const file = e?.dataTransfer.files[0];
    const fileTitle = e?.dataTransfer.files[0].name;
    if (file && fileTitle) {
      if (!fileType.includes(file?.type)) {
        return warnMessage(`This file type is not supported.`);
      }

      sendBase64ImageToEditor(file, fileTitle);
    }
  };

  const onPaste = async (e: ClipboardEvent<HTMLDivElement> | undefined) => {
    const clipboardData = e?.clipboardData.items[0];
    if (clipboardData?.kind != 'file') {
      return warnMessage(`Your clipboard item is not a file.`);
    }

    const file = clipboardData.getAsFile();
    if (file) {
      if (!fileType.includes(file?.type)) {
        return warnMessage(`This file type is not supported.`);
      }

      sendBase64ImageToEditor(file, 'Rec');
    }
  };

  const openUploadWindow = () => {
    fileUploader.current?.click();
  };

  return (
    <>
      <div
        className={classNames('tw-w-9/12 tw-m-auto', styles.uploadBackground)}
        onPaste={(e) => onPaste(e)}
      >
        <div className="">
          <img
            className="tw-m-auto tw-w-80 tw-py-10"
            src={browser.runtime.getURL('/images/logo/logo_black.svg')}
          />
        </div>
        <div
          className="tw-m-auto tw-p-28 tw-bg-transparent tw-w-80p tw-rounded-xl tw-cursor-pointer tw-border-2 tw-border-dashed tw-border-upload-border"
          onClick={openUploadWindow}
          onDrop={(e) => onDrop(e)}
          onPaste={(e) => onPaste(e)}
        >
          <div>
            <div className="tw-m-auto tw-flex tw-justify-between tw-max-w-sm">
              <img
                className="tw-m-auto"
                src={browser.runtime.getURL(
                  '/images/panel/images/pc-upload.svg',
                )}
              />
              <img
                className="tw-m-auto"
                src={browser.runtime.getURL(
                  '/images/panel/images/arrow-upload.svg',
                )}
              />
              <img
                className="tw-m-auto"
                src={browser.runtime.getURL(
                  '/images/panel/images/annotate-screenshot.svg',
                )}
              />
            </div>
          </div>
          <div className="tw-m-auto tw-text-center tw-pt-16 ">
            <p className="tw-text-primary-purple tw-font-roboto-bold tw-text-3xl">
              Upload images from your local drive to annotate
              <br />
              with one of the following methods:
            </p>
            <ul className="tw-list-disc tw-w-96 tw-m-auto tw-text-left tw-font-medium tw-text-black tw-text-xl ">
              <li>Drag and drop an image file into this field</li>
              <li>Click to select an image from local disk</li>
              <li>Paste an image from your clipboard (PNG or JPG)</li>
            </ul>
          </div>
        </div>
        <input
          type="file"
          id="file"
          ref={fileUploader}
          style={{ display: 'none' }}
          accept="image/png, image/jpeg"
          onChange={changeUploadFileHandler}
        />
      </div>
      <AppSpinner show={loading} />
    </>
  );
};

export default UploadScreen;
