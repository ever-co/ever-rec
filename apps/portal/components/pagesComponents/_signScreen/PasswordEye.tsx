import { Eye, EyeOff } from 'lucide-react';
import classNames from 'classnames';

interface IPasswordEyeProps {
  passwordShown: boolean;
  className?: string;
  togglePassword: () => void;
}

const PasswordEye: React.FC<IPasswordEyeProps> = ({
  passwordShown,
  className,
  togglePassword,
}) => {
  // Same drawings as before (an open eye while the password is shown, a crossed one while it is
  // hidden), now in the text colour so they read on both themes. The 24px box and the negative
  // margin are what the callers lay the field out around.
  const Icon = passwordShown ? Eye : EyeOff;

  return (
    <button
      onClick={togglePassword}
      className={classNames(
        '-tw-ml-6 tw-flex tw-size-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-text-foreground',
        className,
      )}
    >
      <Icon className="tw-size-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
};

export default PasswordEye;
