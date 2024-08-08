import { forwardRef, Ref } from 'react';
import classNames from 'classnames';

interface IDashboardCardProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const DashboardCard = (
  { className, style, children }: IDashboardCardProps,
  ref: Ref<HTMLDivElement>,
) => {
  return (
    <div
      ref={ref}
      className={classNames('tw-bg-white', className)}
      style={style || {}}
    >
      {children}
    </div>
  );
};

export default forwardRef(DashboardCard);
