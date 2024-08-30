import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { savingData } from '@/app/utilities/popupsData';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import PopupButton from '../../components/popupButton';
import PanelSplitter from '../../../PanelSplitter';
import { DriveUser } from '@/app/services/google/auth';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { dropboxFileUpload } from '@/app/services/general';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { getBlobFromStage } from '../../../../editorHelpers/utils';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { Stage } from 'konva/lib/Stage';
import UploadToCloudModal from '@/content/panel/screens/singleImageScreen/uploadToCloudModal/UploadToCloudModal';
import { IUser } from '@/app/interfaces/IUserData';

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
  const [uploadToCloudType, setUploadToCloudType] = useState<string>('');
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const [uploadToCloudModalState, setUploadToCloudModalState] =
    useState<boolean>(false);
  const closeUploadToCloudModal = () => {
    setUploadToCloudType('');
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
      // mainScale,
    );

    if (type === 'Google Drive') {
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
        onSubpanelClose={() => onToolChange({} as ITool)}
        active={active}
        placement="right"
        title={title}
        onSelect={() => {
          onResetShape();
          onToolChange(tools.saving);
        }}
        icon={tools.saving.icon}
      >
        <div className="tw-transition-all">
          <h2 className="tw-text-ml tw-font-semibold tw-mb-2">
            Download formats
          </h2>
          <div className="  tw-flex tw-items-center  tw-mb-4 ">
            {savingData.map((data, index) =>
              data.local_save ? (
                <PopupButton
                  iconSrc={data.icon}
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
          <h2 className="tw-text-ml tw-font-semibold tw-mb-2">Save to cloud</h2>
          <div className="tw-flex tw-items-center tw-justify-start ">
            {savingData.map((data, index) =>
              !data.local_save && driveUser && data.type === 'Google Drive' ? (
                <PopupButton
                  iconSrc={data.icon}
                  key={index}
                  onSelect={() => {
                    openUploadToDropBoxCloudModal(data.type);
                  }}
                />
              ) : !data.local_save &&
                user?.dropbox?.isDropBoxIntegrated &&
                data.type === 'Dropbox' ? (
                <PopupButton
                  iconSrc={data.icon}
                  key={index}
                  onSelect={() => {
                    openUploadToDropBoxCloudModal(data.type);
                  }}
                />
              ) : !data.local_save ? (
                <PopupButton
                  disabled={true}
                  iconSrc={data.icon}
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
        oldName={image?.dbData?.title}
        visible={uploadToCloudModalState}
        onClose={() => setUploadToCloudModalState(false)}
        onOk={uploadToCloudHandler}
      />
    </>
  );
};

export default SavingTool;
