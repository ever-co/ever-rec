import React, { useEffect, useRef, useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import AppInput from '@/content/components/controls/appInput/AppInput';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { requiredRule } from '@/app/rules';
import IAppControl, { IAppControlData } from '@/app/interfaces/IAppControl';
import AppSvg from '@/content/components/elements/AppSvg';

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
      <div className="tw-flex tw-flex-col tw-w-330px  tw-p-2px ">
        <div className="tw-flex tw-w-full tw-items-start tw-justify-start  tw-flex-col  ">
          <div className="tw-flex tw-items-center tw-mb-2">
            <AppSvg
              path="images/panel/common/google-drive-black.svg"
              size="30px"
              className="tw-mr-2"
            />
            <h2 className="tw-text-2xl tw-font-semibold">
              Save to Google Drive
            </h2>
          </div>
          <AppInput
            placeholder="Name"
            value={name.value}
            errors={name.errors}
            onChange={nameChangeHandler}
            rules={nameRules}
            className=" tw-w-full "
          />
        </div>
        <div className="tw-flex tw-w-full tw-items-end tw-justify-end  tw-flex-row">
          <AppButton
            onClick={closeSubpanel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-2 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={() => {
              closeSubpanel();
              onOkHandler();
            }}
            className="tw-px-8 tw-pb-1 tw-pt-1"
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
