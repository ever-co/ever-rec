import React, { useEffect, useRef, useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import AppInput from 'components/controls/AppInput';
import AppButton from 'components/controls/AppButton';
import { requiredRule } from 'app/rules';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import AppSvg from 'components/elements/AppSvg';
import styles from './googleDriveTool.module.scss';

interface IGoogleDriveProps {
  active: boolean;
  isOpenDriveTool: boolean;
  onSelect: (tool: ITool | null) => void;
  oldName?: string;
  onOk: (name: string) => void;
}

const GoogleDriveTool: React.FC<IGoogleDriveProps> = ({
  active,
  isOpenDriveTool,
  onSelect,
  oldName,
  onOk,
}) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const subpanelRef = useRef<{
    closePanel: () => void;
  }>(null);

  const closeSubpanelHandler = () => onSelect(null);

  const closeSubpanel = () => subpanelRef?.current?.closePanel();

  const nameRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter file name'),
  ];

  const nameChangeHandler = ({ value, errors }: IAppControlData) => {
    setName({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const onOkHandler = async (): Promise<void> => {
    if (valid) {
      onOk(name.value);
      setName(initialControl());
    }
  };

  useEffect(() => {
    oldName &&
      setName({
        value: oldName,
        touched: true,
        errors: [],
      });
  }, [oldName]);

  const [name, setName] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  useEffect(() => {
    setValid(
      [name].every((control) => control.touched && !control.errors.length),
    );
  }, [name]);

  return (
    <ToolBtn
      isOpenEditTool={isOpenDriveTool}
      onSelect={() => onSelect(tools.drive)}
      icon={tools.drive.icon}
      active={active}
      onSubpanelClose={closeSubpanelHandler}
      ref={subpanelRef}
      placement="right"
    >
      <div className={styles.parentContainer}>
        <div className={styles.flexColumnContainer}>
          <div className={styles.flexContainer}>
            <AppSvg
              path="/common/google-drive-black.svg"
              size="30px"
              className={styles.iconWrapper}
            />
            <h2 className={styles.title}>
              Save to Google Drive
            </h2>
          </div>
          <AppInput
            placeholder="Name"
            value={name.value}
            errors={name.errors}
            onChange={nameChangeHandler}
            rules={nameRules}
            className={styles.inputWrapper}
          />
        </div>
        <div className={styles.flexRowContainer}>
          <AppButton
            onClick={closeSubpanel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className={styles.buttonWrapper}
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={() => {
              closeSubpanel();
              onOkHandler();
            }}
            className={styles.button}
            disabled={!valid}
          >
            Save
          </AppButton>
        </div>
      </div>
    </ToolBtn>
  );
};

export default GoogleDriveTool;
