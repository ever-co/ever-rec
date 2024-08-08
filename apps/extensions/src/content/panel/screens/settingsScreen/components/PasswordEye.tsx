import AppSvg from '@/content/components/elements/AppSvg';
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
  return (
    <button
      onClick={togglePassword}
      className={classNames('-tw-ml-6', className)}
    >
      <AppSvg
        path={
          passwordShown
            ? '/images/images/show.svg'
            : '/images/images/eye-light.svg'
        }
        size="24px"
      />
    </button>
  );
};

export default PasswordEye;
