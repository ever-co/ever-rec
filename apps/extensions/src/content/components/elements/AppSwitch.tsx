import React from 'react';
import Switch from 'react-switch';

interface IAppSwitchProp {
  checked: boolean;
  onChange: (value: boolean) => void;
}

const AppSwitch: React.FC<IAppSwitchProp> = ({ checked, onChange }) => {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      onColor="#cdc9eb"
      onHandleColor="#5B4DBE"
      handleDiameter={20}
      uncheckedIcon={false}
      checkedIcon={false}
      boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
      activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
      height={14}
      width={34}
    ></Switch>
  );
};

export default AppSwitch;
