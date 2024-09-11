import React, { FC } from 'react';
import Switch from 'react-switch';

const SwitchReact = Switch as any;

interface IAppSwitchProps {
  switched?: boolean;
  disabled?: boolean;
  handleSwitch: (value: boolean) => void;
}

const AppSwitchNew: FC<IAppSwitchProps> = ({
  switched = false,
  disabled = false,
  handleSwitch,
}) => {
  return (
    <SwitchReact
      onChange={handleSwitch}
      uncheckedIcon={false}
      checkedIcon={false}
      checked={switched}
      height={22}
      width={46}
      onColor="#5b4dbe"
      handleDiameter={16}
      disabled={disabled}
    />
  );
};

export default AppSwitchNew;
