import { FC } from 'react';
import styles from './ProfileDetail.module.scss';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';

interface IProps {
  title: string;
  value?: string;
  valueColor?: string;
  disabled?: boolean;
  clicked: () => void;
}

const ProfileDetail: FC<IProps> = ({
  title,
  value,
  valueColor = 'hsl(var(--foreground))',
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
            path="/settings/profile/right-arrow.svg"
            size="20px"
            className="rtl:-tw-scale-x-100"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
