import classNames from 'classnames';
import Image from 'next/image';
import React from 'react';
import styles from './toolSubPanelBtn.module.scss';
import { Tooltip } from 'antd';
// import { IconContext } from 'react-icons';
interface IToolSubPanelBtn {
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  toolTitle?: string;
}

const ToolSubPanelBtn: React.FC<IToolSubPanelBtn> = ({
  icon,
  disabled,
  active,
  onSelect,
  toolTitle,
}) => {
  const clickHandler = () => {
    !disabled && onSelect();
  };

  return (
    <div
      className={classNames(
        styles.parentContainer,
        disabled ? styles.lowOpacity : styles.highOpacity,
        active ? styles.active : styles.notActive,
      )}
      onClick={clickHandler}
    >
      <Tooltip title={toolTitle}>
        <div
          className={classNames(
            !active ? styles.container : styles.activeContainer,
          )}
        >
          {/* <IconContext.Provider
          value={{
            style: { strokeWidth: '0.5' },
          }}
        > */}
          <div className={styles.flexContainer}>
            <Image src={icon} />
          </div>
          {/* </IconContext.Provider> */}
        </div>
      </Tooltip>
    </div>
  );
};

export default ToolSubPanelBtn;
