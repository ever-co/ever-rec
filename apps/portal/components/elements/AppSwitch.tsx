import React from 'react';
import Switch from 'react-switch';
import useResolvedTheme from 'components/theme/useResolvedTheme';

interface IAppSwitchProp {
  checked: boolean;
  onChange: (value: boolean) => void;
}

// react-switch blends between its colours while the handle moves, so it needs plain hex values:
// these are the token values of each theme (off = the control border, on = the primary action).
const COLORS = {
  light: { off: '#d4d4d8', on: '#18181b', handle: '#ffffff' },
  dark: { off: '#3f3f46', on: '#ededed', handle: '#18181b' },
};

const AppSwitch: React.FC<IAppSwitchProp> = ({ checked, onChange }) => {
  const theme = useResolvedTheme() ?? 'light';
  const colors = COLORS[theme];

  return (
    <Switch
      checked={checked}
      onChange={onChange}
      offColor={colors.off}
      onColor={colors.on}
      offHandleColor="#ffffff"
      onHandleColor={colors.handle}
      handleDiameter={16}
      uncheckedIcon={false}
      checkedIcon={false}
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.2)"
      activeBoxShadow="0 0 0 3px rgba(128, 128, 128, 0.25)"
      height={20}
      width={36}
    ></Switch>
  );
};

export default AppSwitch;
