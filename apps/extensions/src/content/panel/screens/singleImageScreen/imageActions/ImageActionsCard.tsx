import classNames from 'classnames';


const ImageActionsCard: React.FC<{ className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={classNames(
        'tw-rounded-2lg tw-bg-white tw-shadow-app-blocks tw-p-5 tw-mb-3 tw-overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ImageActionsCard;
