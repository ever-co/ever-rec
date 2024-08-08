import { signOutUser } from '@/app/services/auth';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';

const AccountScreen: React.FC = () => {
  return (
    <div className="tw-flex tw-justify-center tw-p-4">
      <AppButton
        onClick={signOutUser}
        bgColor="tw-bg-danger"
        className="tw-mr-3"
      >
        <AppSvg path="images/panel/sign/logout.svg" className="tw-mr-2" />
        Logout
      </AppButton>
    </div>
  );
};

export default AccountScreen;
