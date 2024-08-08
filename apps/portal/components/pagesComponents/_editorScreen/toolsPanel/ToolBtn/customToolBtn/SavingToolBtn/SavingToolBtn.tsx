/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { savingData } from 'app/utilities/popupsData';
import PanelSplitter from '../../../PanelSplitter';
import PopupButton from '../../components/popupButton';
import {
  errorMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { RootStateOrAny, useSelector } from 'react-redux';
import UploadToCloudModal from 'components/pagesComponents/_singleImageScreen/uploadToCloudModal/UploadToCloudModal';
import { DriveUser } from 'app/services/google/auth';
import IEditorImage from 'app/interfaces/IEditorImage';
import { dropboxFileUpload } from 'app/services/general';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import useAuthenticateUser from '../../../../../../../hooks/useAuthenticateUser';
import { Stage } from 'konva/lib/Stage';
import { getBlobFromStage } from '../../../../../../../components/pagesComponents/_editorScreen/editorHelpers/utils';
import styles from './savingToolBtn.module.scss';

interface ISavingProps {
  isOpenEditTool: boolean;
  active: boolean;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
  downloadPng: () => void;
  downloadJpg: () => void;
  downloadPdf: () => void;
  saveToDrive: (name: string) => void;
  image: IEditorImage;
  stage: Stage;
  initialDimentions: {
    width: number;
    height: number;
  };
  resizeDimentions: {
    width: number;
    height: number;
  };
  stageScale: number;
  setLoading: (imageLoaded: boolean) => void;
}
const SavingTool: React.FC<ISavingProps> = ({
  isOpenEditTool,
  active,
  onToolChange,
  onResetShape,
  title,
  downloadPng,
  downloadJpg,
  downloadPdf,
  saveToDrive,
  image,
  stage,
  initialDimentions,
  resizeDimentions,
  stageScale,
  setLoading,
}) => {
  const [uploadToCloudType, setUploadToCloudType] = useState<string>(null);
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const user = useAuthenticateUser();

  const [uploadToCloudModalState, setUploadToCloudModalState] =
    useState<boolean>(false);

  const closeUploadToCloudModal = () => {
    setUploadToCloudType(null);
    setUploadToCloudModalState(false);
  };

  const uploadToCloudHandler = async (name: string, type?: string) => {
    closeUploadToCloudModal();
    const blob = await getBlobFromStage(
      stage,
      resizeDimentions.height !== 0 && resizeDimentions.width !== 0
        ? resizeDimentions
        : initialDimentions,
      stageScale,
    );

    if (type === 'Google drive') {
      saveToDrive(name);
    } else if (type === 'Dropbox') {
      setLoading(false);
      const response = await dropboxFileUpload(
        name,
        blob,
        image.dbData?.id,
        'image',
      );
      if (response.status == ResStatusEnum.success) {
        successMessage('Image uploaded successfully.');
      } else {
        errorMessage(
          response.message || 'Something went wrong, Please try again later',
        );
      }
      setLoading(true);
    }
  };

  const openUploadToDropBoxCloudModal = async (type?: any) => {
    setUploadToCloudModalState(true);
    setUploadToCloudType(type);
  };
  return (
    <>
      <ToolBtn
        toolTitle={tools.saving.title}
        isOpenEditTool={isOpenEditTool}
        onSubpanelClose={() => onToolChange(null)}
        active={active}
        placement="right"
        title={title}
        onSelect={() => {
          onResetShape();
          onToolChange(tools.saving);
          // infoMessage('We are working hard to add this feature!');
        }}
        icon={tools.saving.icon}
      >
        <div className={styles.mainContainer}>
          <h2 className={styles.title}>
            Download formats
          </h2>
          <div className={styles.container}>
            {savingData.map((data, index) =>
              // eslint-disable-next-line @next/next/no-img-element
              data.local_save ? (
                <PopupButton
                  iconSrc={data.icon.src}
                  key={index}
                  onSelect={
                    data.type === 'png'
                      ? downloadPng
                      : data.type === 'jpg'
                      ? downloadJpg
                      : downloadPdf
                  }
                />
              ) : null,
            )}
          </div>
          <PanelSplitter />
          <h2 className={styles.title}>Save to cloud</h2>
          <div className={styles.flexContainer}>
            {savingData.map((data, index) =>
              // eslint-disable-next-line @next/next/no-img-element
              !data.local_save && driveUser && data.type === 'Google drive' ? (
                <PopupButton
                  iconSrc={data.icon.src}
                  key={index}
                  onSelect={() => {
                    openUploadToDropBoxCloudModal(data.type);
                  }}
                />
              ) : !data.local_save &&
                user.dropbox.isDropBoxIntegrated &&
                data.type === 'Dropbox' ? (
                <PopupButton
                  iconSrc={data.icon.src}
                  key={index}
                  onSelect={() => {
                    openUploadToDropBoxCloudModal(data.type);
                  }}
                />
              ) : !data.local_save ? (
                <PopupButton
                  disabled={true}
                  iconSrc={data.icon.src}
                  key={index}
                  onSelect={() => {
                    openUploadToDropBoxCloudModal(data.type);
                  }}
                />
              ) : null,
            )}
          </div>
        </div>
      </ToolBtn>

      <UploadToCloudModal
        type={uploadToCloudType}
        oldName={image.dbData.title}
        visible={uploadToCloudModalState}
        onClose={() => setUploadToCloudModalState(false)}
        onOk={uploadToCloudHandler}
      />
    </>
  );
};

export default SavingTool;
