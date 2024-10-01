import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IAppControl, { IAppControlData } from '@/app/interfaces/IAppControl';
import { requiredRule, sameRule } from '@/app/rules';
import AppInput from '@/content/components/controls/appInput/AppInput';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { RootStateOrAny, useSelector } from 'react-redux';
import IExplorerData from '@/app/interfaces/IExplorerData';

interface IEditFolderModalProps {
  visible: boolean;
  oldName: string;
  onClose: () => void;
  onEditFolder: (name: string) => void;
}

const EditFolderModal: React.FC<IEditFolderModalProps> = ({
  oldName,
  visible,
  onClose,
  onEditFolder,
}) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [folderName, setFolderName] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );

  useEffect(() => {
    const existingPictureFolder = explorerData.folders.filter(function (
      folder,
    ) {
      return folder.name === folderName.value && folder.name !== oldName;
    });

    const existingVideoFolder = explorerDataVideos.folders.filter(function (
      folder,
    ) {
      return folder.name === folderName.value && folder.name !== oldName;
    });

    if (
      (existingPictureFolder.length > 0 &&
        window.location.pathname === '/my-images-videos/my-image.html') ||
      (existingVideoFolder.length > 0 &&
        window.location.pathname === '/my-images-videos/my-video.html')
    ) {
      setFolderName({
        errors: ['This folder already exists'],
        touched: true,
        value: folderName.value,
      });
    } else if (folderName.value?.length > 35) {
      setFolderName({
        errors: ['Folder name can not contain more than 35 characters'],
        touched: true,
        value: folderName.value,
      });
    } else if (folderName.value?.length < 1 && folderName.touched) {
      setFolderName({
        errors: ['Folder name can not be empty'],
        touched: true,
        value: folderName.value,
      });
    } else {
      setFolderName({
        errors: [],
        touched: true,
        value: folderName.value,
      });
    }
  }, [folderName.value]);

  useEffect(() => {
    setFolderName({
      value: oldName,
      errors: [],
      touched: true,
    });
  }, [oldName]);

  useEffect(() => {
    setValid(
      [folderName].every(
        (control) => control.touched && !control.errors.length,
      ) &&
        folderName.value?.length < 36 &&
        folderName.value?.length > 0,
    );
  }, [folderName]);

  const folderNameRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter folder name'),
    sameRule(oldName, 'This is current folder name'),
  ];

  const onOkHandler = async (): Promise<void> => {
    if (valid) {
      onEditFolder(folderName.value);
      setFolderName(initialControl());
    }
  };

  const folderNameChangeHandler = ({ value, errors }: IAppControlData) => {
    setFolderName({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-4">
          <AppButton
            onClick={onClose}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={!valid}
          >
            Change Name
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">Edit folder</h2>
      <AppInput
        placeholder="Folder name"
        value={folderName.value}
        errors={folderName.errors}
        onChange={folderNameChangeHandler}
        rules={folderNameRules}
      />
    </Modal>
  );
};

export default EditFolderModal;
