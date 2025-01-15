import { FC } from 'react';
import * as styles from './ProfileDetail.module.scss';
import classNames from 'classnames';
import AppSvg from '@/content/components/elements/AppSvg';

interface IProps {
  title: string;
  value?: string | null;
  valueColor?: string;
  disabled?: boolean;
  clicked: () => void;
}

const ProfileDetail: FC<IProps> = ({
  title,
  value,
  valueColor = 'black',
  disabled = false,
  clicked,
}) => {
  return (
    <div
      className={classNames(
        styles.profileDetail,
        disabled && styles.profileDetailDisabled,
      )}
      onClick={clicked}
    >
      <span>{title}</span>
      <div>
        {value && <span style={{ color: valueColor }}>{value}</span>}

        <div className={styles.profileDetailRightArrow}>
          <AppSvg
            path="images/panel/settings/profile/right-arrow.svg"
            size="25px"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
