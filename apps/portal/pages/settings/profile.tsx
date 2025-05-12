import { ChangeEvent, useEffect, useState } from 'react';
import styles from 'pagesScss/settings/Profile.module.scss';
import {
  changeUserEmail,
  changeUserPassword,
  deleteUser,
  login,
  signOut,
  updateUserData,
  uploadAvatar,
} from 'app/services/auth';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { FileUploader } from 'components/controls/FileUploader';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import {
  errorMessage,
  loadingMessage,
  successMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import Settings from '.';
import AuthAC from '../../store/auth/actions/AuthAC';
import { IUser } from 'app/interfaces/IUserData';
import ProfileDetail from 'components/pagesComponents/profileScreen/ProfileDetail';
import ProfileSidebar from 'components/pagesComponents/profileScreen/ProfileSidebar';
import ProfileAccountPhoto from 'components/pagesComponents/profileScreen/ProfileAccountPhoto';
import ChangeEmailModal from 'components/pagesComponents/profileScreen/ChangeEmailModal';
import ChangeNameModal from 'components/pagesComponents/profileScreen/ChangeNameModal';
import ChangePasswordModal from 'components/pagesComponents/profileScreen/ChangePassword';
import DeleteAccountModal from 'components/pagesComponents/profileScreen/DeleteAccountModal';
import { preRoutes, panelRoutes } from 'components/_routes';
import { useRouter } from 'next/router';
import { errorHandler } from 'app/services/helpers/errors';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { BiLoaderAlt } from 'react-icons/bi';
import { useTranslation } from 'react-i18next';

const avaSize = 88;

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const router = useRouter();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const imageLoader: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.loaderState,
  );
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteAccountModal] = useState(false);
  const [toDeleteAccountLogin, setToDeleteAccountLogin] = useState(false); // used to go to the next step for deleting account

  // Used to disable Password field for Google accounts
  useEffect(() => {
    const isGoogleAccount = user && user.provider === 'google.com';
    setIsGoogleAccount(isGoogleAccount);
  }, [user]);

  const updateReduxUser = ({
    displayName,
    photoURL,
  }: {
    displayName?: string;
    photoURL?: string;
  }) => {
    const newUser = {
      ...user,
      displayName: displayName ? displayName : user.displayName,
      photoURL: photoURL ? photoURL : user.photoURL,
    };

    dispatch(AuthAC.setUser({ user: newUser }));
  };

  const onFileSelectedHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      dispatch(PanelAC.setLoaderState(true));

      const photoURL = await uploadAvatar(event.target.files[0]);

      updateReduxUser({ photoURL: photoURL || undefined });
      dispatch(PanelAC.setLoaderState(false));
    }
  };

  const changeName = async (newName: string) => {
    if (!newName) return;
    t('toasts.');
    const id = loadingMessage(t('toasts.updatingName'));
    const data = await updateUserData({
      displayName: newName,
    });

    setShowNameModal(false);

    if (!data) return updateMessage(id, t('toasts.couldNotUpdate'), 'error');

    updateReduxUser(data);
    updateMessage(id, t('toasts.nameUpdated'), 'success');
  };

  const changeEmail = async (newEmail: string) => {
    if (!newEmail) return;

    const id = loadingMessage(t('toasts.updatingEmail'));
    const response = await changeUserEmail(newEmail);
    const message = response.message;
    const email = response.data?.email;

    if (email) {
      dispatch(AuthAC.setUser({ user: { ...user, email } }));
      setShowEmailModal(false);
      updateMessage(id, t('toasts.emailUpdated'), 'success');
    } else {
      updateMessage(id, message, 'error');
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!newPassword || !oldPassword) return;

    const id = loadingMessage(t('toasts.updatingPassword'));
    const response = await changeUserPassword(
      user.email,
      oldPassword,
      newPassword,
    );

    setShowPasswordModal(false);

    if (!response.data)
      return updateMessage(id, t('toasts.couldNotUpdate'), 'error');

    updateMessage(id, t('toasts.passwordUpdated'), 'success');
  };

  const loginToDeleteAccount = async (password: string) => {
    const response = await login(user.email, password, false);

    if (response.status === 'success') {
      setToDeleteAccountLogin(true);
      return;
    }

    errorMessage(t('toasts.couldNotReauthenticate'));
    setShowDeleteAccountModal(false);
  };

  const deleteAccount = () => {
    deleteUserHandler();
    setShowDeleteAccountModal(false);
    setToDeleteAccountLogin(false);
  };

  // older code, not worth a refactor
  //! Deletes account and resets global state
  const deleteUserHandler = async () => {
    try {
      await deleteUser();
      await signOutHandler();
      successMessage(t('toasts.accountDeleted'));
    } catch (error: any) {
      console.log('error', error);
      if (error.code === 'auth/user-mismatch') {
        errorHandler({ message: t('toasts.couldNotDeleteAccount') });
      } else {
        error.code !== 'auth/requires-recent-login' &&
          errorHandler({ message: t('toasts.errorDeletingUser') });
      }
    }
  };

  const signOutHandler = async () => {
    signOut();

    dispatch(AuthAC.setUser({ user: null }));
    dispatch(PanelAC.resetExplorerDataLoader());
    dispatch(PanelAC.resetExplorerDataLoaderVideos());
    dispatch(PanelAC.resetWorkspaces());

    router.push(preRoutes.auth + panelRoutes.login);
  };

  return (
    <Settings>
      <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />

      <div className={styles.profileContainer}>
        <div className={styles.profileSettings}>
          <div className={styles.profileSettingsMain}>
            <div className={styles.profilePhoto}>
              <h1>{t('page.profile.title')}</h1>

              <FileUploader onFileSelected={onFileSelectedHandler}>
                {({ onFileSelectorOpen }) => (
                  <div>
                    {imageLoader && (
                      <div
                        style={{
                          height: avaSize - 1,
                          width: avaSize,
                        }}
                        className="tw-bg-black/40 tw-absolute tw-rounded-full tw-flex tw-justify-center tw-item-center"
                      >
                        <BiLoaderAlt
                          style={{
                            height: avaSize / 3,
                            width: avaSize / 3,
                          }}
                          className={'tw-animate-spin tw-text-white '}
                        />
                      </div>
                    )}
                    <ProfileAccountPhoto
                      photoURL={user?.photoURL || ''}
                      avatarSize={avaSize}
                      clicked={onFileSelectorOpen}
                    />

                    <span onClick={onFileSelectorOpen}>{t('common.edit')}</span>
                  </div>
                )}
              </FileUploader>
            </div>

            <div className={styles.profileDetails}>
              <ProfileDetail
                title={t('common.name')}
                value={user?.displayName}
                clicked={() => setShowNameModal(true)}
              />
              <ProfileDetail
                title={t('page.image.email')}
                value={user?.email}
                disabled={isGoogleAccount}
                clicked={() => !isGoogleAccount && setShowEmailModal(true)}
              />
              <ProfileDetail
                title={t('page.profile.settings.password')}
                value={
                  isGoogleAccount
                    ? t('page.profile.loggedInWithGoogle')
                    : undefined
                }
                disabled={isGoogleAccount}
                clicked={() => !isGoogleAccount && setShowPasswordModal(true)}
              />
            </div>
          </div>

          <div className={styles.profileDeleteAccount}>
            <ProfileDetail
              title={t('page.profile.account.title')}
              value={t('page.setting.deleteAccount')}
              valueColor="red"
              clicked={() => setShowDeleteAccountModal(true)}
            />
          </div>

          <span className={styles.profileSignOut} onClick={signOutHandler}>
            {t('header.user.signout')}
          </span>
        </div>

        <ProfileSidebar />
      </div>

      <ChangeNameModal
        name={user?.displayName || ''}
        visible={showNameModal}
        onClose={() => setShowNameModal(false)}
        onOk={(newName) => changeName(newName)}
      />

      <ChangeEmailModal
        email={user?.email || ''}
        visible={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onOk={(newEmail) => changeEmail(newEmail)}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onOk={(oldPassword, newPassword) =>
          changePassword(oldPassword, newPassword)
        }
      />

      <DeleteAccountModal
        email={user?.email || ''}
        loggedIn={toDeleteAccountLogin}
        visible={showDeleteModal}
        onLogin={(password) => loginToDeleteAccount(password)}
        onDeleteAccount={deleteAccount}
        onClose={() => {
          setToDeleteAccountLogin(false);
          setShowDeleteAccountModal(false);
        }}
      />
    </Settings>
  );
};

export default Profile;

// const driveUser: DriveUser = useSelector(
//   (state: RootStateOrAny) => state.auth.driveUser,
// );

// const useGoogleAccountAvatar = async () => {
//   dispatch(PanelAC.setLoaderState(true));
//   const user: DriveUser | undefined = driveUser || (await getDriveUser());
//   user &&
//     (await updateUserData({
//       photoURL: user?.picture,
//     }));
//   dispatch(PanelAC.setLoaderState(false));
// };
