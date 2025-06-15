import { ChangeEvent, useEffect, useState } from 'react';
import * as styles from './ProfilePage.module.scss';
import {
  changeUserEmail,
  changeUserPassword,
  deleteUser,
  signInWithEmailAndPassword,
  updateUserData,
  uploadAvatar,
} from '@/app/services/auth';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { FileUploader } from '@/content/components/controls/fileUploader/FileUploader';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import ISettingsPageProps from '../interface/ISettingsPage';
import {
  errorMessage,
  loadingMessage,
  successMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import { IUser } from '@/app/interfaces/IUserData';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import {
  removeStorageItems,
  setStorageItems,
} from '@/app/services/localStorage';
import ProfileAccountPhoto from '../components/ProfileAccountPhoto';
import ProfileDetail from '../components/ProfileDetail';
import ProfileSidebar from '../components/ProfileSidebar';
import ChangeEmailModal from '../components/ChangeEmailModal';
import ChangeNameModal from '../components/ChangeNameModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { errorHandler } from '@/app/services/helpers/errors';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { AppMessagesEnum } from '@/app/messagess';
import DeleteAccountModal from '../components/DeleteAccountModal';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';
import { useTranslation } from 'react-i18next';

const avaSize = 88;

const ProfilePage: React.FC<ISettingsPageProps> = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteAccountModal] = useState(false);
  const [toDeleteAccountLogin, setToDeleteAccountLogin] = useState(false); // used to go to the Second step for deleting account

  // Used to disable Password field for Google accounts
  useEffect(() => {
    const isGoogleAccount = user && user.provider === 'google.com';
    setIsGoogleAccount(isGoogleAccount);
  }, [user]);

  const onFileSelectedHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      dispatch(PanelAC.setLoaderState(true));
      const response = await uploadAvatar(event.target.files[0]);
      if (response && response.data) {
        const photoURL = response.data.photoURL || user.photoURL;
        dispatch(
          AuthAC.setUser({
            user: { ...user, photoURL },
          }),
        );
        await setStorageItems({ photoURL });
      }
      dispatch(PanelAC.setLoaderState(false));
    }
  };

  const changeName = async (newName: string) => {
    if (!newName) return;

    const id = loadingMessage(t('toasts.updatingName'));
    const data = await updateUserData({
      displayName: newName,
    });

    setShowNameModal(false);

    if (!data?.displayName)
      return updateMessage(id, t('toasts.couldNotUpdateTheName'), 'error');

    dispatch(
      AuthAC.setUser({
        user: { ...user, displayName: data.displayName },
      }),
    );
    setStorageItems({ displayName: data.displayName }); // portal sends externalMessage "updateUserData", here we have to set it.
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
    const response = await signInWithEmailAndPassword(user.email, password);

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
      dispatch(PanelAC.setLoaderState(true));
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
    } finally {
      dispatch(PanelAC.setLoaderState(false));
    }
  };

  const signOutHandler = async () => {
    await removeStorageItems(['idToken', 'refreshToken']);

    const activeTab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    sendRuntimeMessage({
      action: AppMessagesEnum.createLoginTabSW,
      payload: {
        justInstalled: false,
        signedOut: true,
        tab: activeTab[0],
        normalLogout: true,
      },
    });
  };

  return (
    <>
      <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />

      <div className={styles.profileContainer}>
        <div className={styles.profileSettings}>
          <div className={styles.profileSettingsMain}>
            <div className={styles.profilePhoto}>
              <h1>{t('page.profile.title')}</h1>

              <FileUploader onFileSelected={onFileSelectedHandler}>
                {({ onFileSelectorOpen }) => (
                  <div>
                    <ProfileAccountPhoto
                      photoURL={user?.photoURL}
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
      </div>
    </>
  );
};

export default ProfilePage;

// const driveUser: DriveUser = useSelector(
//   (state: RootStateOrAny) => state.auth.driveUser,
// );

// const useGoogleAccountAvatar = async () => {
//   dispatch(PanelAC.setLoaderState(true));
//   const user: DriveUser | undefined = driveUser || (await getDriveUser());
//   user &&
//     (await updateUserData({
//       photoURL: user.picture,
//     }));
//   dispatch(PanelAC.setLoaderState(false));
// };
