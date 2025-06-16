import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IAppControl, { IAppControlData } from '@/app/interfaces/IAppControl';
import { requiredRule } from '@/app/rules';
import AppInput from '@/content/components/controls/appInput/AppInput';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { RootStateOrAny, useSelector } from 'react-redux';
import IExplorerData from '@/app/interfaces/IExplorerData';
import colorPalet from './colorPalet';
import ColorElement from '../ColorElement/ColorElement';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { ColorPicker } from '../ColorElement/ColorPicker';
import { useTranslation } from 'react-i18next';

interface ICreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color: string) => void;
}

const CreateFolderModal: React.FC<ICreateFolderModalProps> = ({
  onClose,
  onCreateFolder,
  visible,
}) => {
  const { t } = useTranslation();
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });
  const initialColor = '#FF2116';

  const [folderName, setFolderName] = useState<IAppControl>(initialControl());
  const [color, setColor] = useState<string>(initialColor);
  const [valid, setValid] = useState<boolean>(false);

  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const existingWorkspaceFolder = activeWorkspace?.folders?.filter(
    (x) => x.name === folderName?.value,
  );

  useEffect(() => {
    const existingPictureFolder = explorerData.folders.filter(
      (folder) => folder.name === folderName.value,
    );

    const existingVideoFolder = explorerDataVideos.folders.filter(
      (folder) => folder.name === folderName.value,
    );

    // todo fix - dont use window.location.pathname
    if (
      (existingPictureFolder?.length > 0 &&
        window.location.pathname.includes('/media/images')) ||
      (existingVideoFolder?.length > 0 &&
        window.location.pathname.includes('/media/videos')) ||
      (existingWorkspaceFolder?.length > 0 &&
        window.location.pathname.includes('workspace'))
    ) {
      setFolderName({
        errors: [t('toasts.folderExists')],
        touched: true,
        value: folderName.value,
      });
    } else if (folderName.value.length > 35) {
      setFolderName({
        errors: [t('toasts.folderNameTooLong')],
        touched: true,
        value: folderName.value,
      });
    } else if (folderName.value.length < 1 && folderName.touched) {
      setFolderName({
        errors: [t('toasts.folderNameEmpty')],
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
    setValid(
      [folderName].every(
        (control) => control.touched && !control.errors.length,
      ) &&
        folderName.value.length < 36 &&
        folderName.value.length > 0,
    );
  }, [folderName]);

  const folderNameRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('toasts.enterFolderName')),
  ];

  const onOkHandler = async (): Promise<void> => {
    if (valid) {
      onCreateFolder(folderName.value, color);
      setFolderName(initialControl());
      setColor(initialColor);
    }
  };

  const folderNameChangeHandler = ({ value, errors }: IAppControlData) => {
    setFolderName({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const handleColor = (value: string) => {
    setColor(value);
  };

  const onCancel = () => {
    setFolderName(initialControl());
    setColor(initialColor);
    setValid(false);
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-4">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-mx-4 tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
            disabled={!valid}
          >
            {t('modals.create')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        {t('modals.createAFolder')}
      </h2>
      <AppInput
        placeholder={t('modals.enterAFolderName')}
        value={folderName.value}
        errors={folderName.errors}
        onChange={folderNameChangeHandler}
        rules={folderNameRules}
        maxLength={35}
      />
      <div className="tw-mt-2 tw-text-lg tw-ml-1">
        {t('modals.selectFolder')}{' '}
        <span className="tw-font-semibold" style={{ color: color }}>
          {t('modals.color')}
        </span>
      </div>
      <div className="tw-flex tw-items-center tw-space-x-4"></div>
      <div className="tw-my-4 tw-flex tw-w-full tw-justify-center tw-h-25px tw-items-center">
        <p className="tw-mt-2 tw-mr-1">{t('modals.custom')}</p>{' '}
        <ColorPicker color={color} setColor={handleColor} />
        <p className="tw-h-7 tw-w-[1px] tw-mt-1 tw-bg-black tw-mx-2"></p>{' '}
        {colorPalet.map((item, index) => (
          <div key={index}>
            <ColorElement
              color={color}
              colorId={item.colorId}
              bgColor={item.bgColor}
              handleColor={handleColor}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default CreateFolderModal;
