import { forwardRef, Ref } from 'react';
import classNames from 'classnames';

interface IDashboardCardProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** A section of a page. It sits straight on the page panel, so it paints no ground of its own. */
const DashboardCard = (
  { className, style, children }: IDashboardCardProps,
  ref: Ref<HTMLDivElement>,
) => {
  return (
    <div ref={ref} className={classNames(className)} style={style || {}}>
      {children}
    </div>
  );
};

export default forwardRef(DashboardCard);
