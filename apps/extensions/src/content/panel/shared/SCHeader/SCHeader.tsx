import { ChangeEvent, FC, useRef } from 'react';
import * as styles from './SCHeader.module.scss';
import classNames from 'classnames';
import { useSelector, RootStateOrAny } from 'react-redux';
import { Tooltip, Dropdown, Menu } from 'antd';
import { IUser } from '@/app/interfaces/IUserData';
import { panelRoutes } from '../../router/panelRoutes';
import AppSvg from '@/content/components/elements/AppSvg';
import UserShortInfo from '../../components/containers/dashboardLayout/elements/UserShortInfo';
import { useNavigate } from 'react-router';
import { useCreateWorkspace } from '@/content/utilities/hooks/useCreateWorkspace';
import { AppMessagesEnum } from '@/app/messagess';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { removeStorageItems } from '@/app/services/localStorage';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { languages } from '../../../../../i18n/constants';
import { useTranslation } from 'react-i18next';

interface ISCHeaderProps {
  filterValue: string | null;
  userPhotoURL?: string | null;
  isWorkspace?: boolean;
  isWorkspaceAdmin?: boolean;
  onFilterChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onInviteMembersButtonClick?: () => void;
}

const SCHeader: FC<ISCHeaderProps> = ({
  filterValue,
  userPhotoURL,
  isWorkspace = false,
  isWorkspaceAdmin = false,
  onFilterChange,
  onInviteMembersButtonClick,
}) => {
  const { t, i18n } = useTranslation();
  const toggleLanguage = (code: string) => {
    i18n.changeLanguage(code);
    // set ns1 as default namespace
  };
  const photoURL = userPhotoURL ?? '/images/panel/sign/default-profile.svg';
  const clickedNotifications = useRef(false); // to be removed when implemented
  const clickedHelpCenter = useRef(false); // to be removed when implemented
  const navigate = useNavigate();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const { Modal: CreateWSModal, setShowCreateWorkspaceModal } =
    useCreateWorkspace();

  const goToProfilePage = () => navigate(panelRoutes.profile.path);

  const goToWorkspace = () => {
    let idParam = '';

    if (activeWorkspace?.id) {
      idParam = `?workspaceId=${activeWorkspace.id}`;
    }

    navigate(`${panelRoutes.workspaceSettings.path}${idParam}`);
  };

  const moreMenu = renderMoreMenuJSX(
    user,
    goToProfilePage,
    () => setShowCreateWorkspaceModal(true),
    signOutHandler,
    (str: any) => t(str),
  );
  const languagesMenu = languagesList((code) => toggleLanguage(code));

  return (
    <div className={styles.appHeader}>
      <div className={styles.search}>
        <AppSvg path="images/new-design-v2/search.svg" />

        <input
          value={filterValue ?? undefined}
          type="text"
          placeholder={t('header.searchFiles')}
          className={styles.appInput}
          onChange={onFilterChange}
          disabled={filterValue === null}
        />
      </div>
      <div className={styles.actions}>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          overlay={languagesMenu}
        >
          <div
            className={classNames(styles.actionButton, styles.profileButton)}
          >
            <p>{t('common.language')}</p>
            <AppSvg path="/new-design-v2/down-caret.svg" size="20px" />
          </div>
        </Dropdown>
        <Tooltip title={t('header.notifications')} placement="bottom">
          <div
            className={styles.actionButton}
            onClick={() => {
              clickedNotifications.current === false &&
                infoMessage(t('header.notificationsSoon'));

              clickedNotifications.current = true;
            }}
          >
            <AppSvg path="images/new-design-v2/notifications.svg" size="20px" />
          </div>
        </Tooltip>
        <Tooltip title={t('header.help')} placement="bottom">
          <div
            className={styles.actionButton}
            onClick={() => {
              clickedHelpCenter.current === false &&
                infoMessage(t('header.helpSoon'));

              clickedHelpCenter.current = true;
            }}
          >
            <AppSvg path="images/new-design-v2/question-mark.svg" size="20px" />
          </div>
        </Tooltip>
        {isWorkspace && (
          <>
            <button
              className={styles.CTAButton}
              onClick={onInviteMembersButtonClick}
            >
              {t('workspace.inviteTeammates')}
            </button>

            {isWorkspaceAdmin && (
              <Tooltip title={t('header.companySettings')} placement="bottom">
                <div className={styles.actionButton} onClick={goToWorkspace}>
                  <AppSvg
                    path="images/new-design-v2/settings-wheel.svg"
                    size="20px"
                  />
                </div>
              </Tooltip>
            )}
          </>
        )}
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          overlay={moreMenu}
        >
          <div
            className={classNames(styles.actionButton, styles.profileButton)}
          >
            <img src={photoURL} alt="" className={styles.profilePicture} />
            <AppSvg path="images/new-design-v2/down-caret.svg" size="20px" />
          </div>
        </Dropdown>
      </div>

      {CreateWSModal}
    </div>
  );
};

export default SCHeader;

const renderMoreMenuJSX = (
  user: IUser,
  goToProfilePage: () => void,
  addNewCompany: () => void,
  signOut: () => void,
  t: (key: string) => string,
) => {
  return (
    <Menu className={styles.profileMenu}>
      <Menu.Item
        key="profile"
        className={styles.menuItem}
        onClick={goToProfilePage}
      >
        <UserShortInfo user={user} />
        <AppSvg
          path="images/new-design-v2/right-caret.svg"
          size="10px"
          color="black"
          style={{ position: 'absolute', top: 'calc(50% - 5px)', right: '5%' }}
        />
      </Menu.Item>

      <Menu.Item
        key="company"
        className={styles.menuItem}
        icon={
          <AppSvg
            path="images/new-design-v2/plus.svg"
            size="19px"
            color="#5b4dbe"
          />
        }
        onClick={addNewCompany}
      >
        <span className={styles.menuItemSpan}>
          {t('header.user.addNewCompany')}
        </span>
      </Menu.Item>

      <Menu.Item
        key="install"
        className={styles.menuItem}
        icon={
          <AppSvg
            path="images/new-design-v2/add-extension.svg"
            size="18px"
            color="#5b4dbe"
          />
        }
        onClick={() => infoMessage(t('header.user.availableSoon'))}
      >
        <span className={styles.menuItemSpan}>
          {t('header.user.installChrome')}
        </span>
      </Menu.Item>

      <Menu.Item
        key="notifications"
        className={classNames(styles.menuItem, styles.menuItemHidden)}
        icon={
          <AppSvg
            path="images/new-design-v2/notifications.svg"
            size="20px"
            color="#5b4dbe"
          />
        }
        onClick={() => infoMessage(t('header.notificationsSoon'))}
      >
        <span className={styles.menuItemSpan}>{t('header.notifications')}</span>
      </Menu.Item>

      <Menu.Item
        key="help-center"
        className={classNames(styles.menuItem, styles.menuItemHidden)}
        icon={
          <AppSvg
            path="images/new-design-v2/question-mark.svg"
            size="20px"
            color="#5b4dbe"
          />
        }
        onClick={() => infoMessage(t('header.helpSoon'))}
      >
        <span className={styles.menuItemSpan}>{t('header.help')}</span>
      </Menu.Item>

      <Menu.Item key="signout" className={styles.menuItem} onClick={signOut}>
        <span className={styles.menuItemSpan} style={{ marginLeft: 0 }}>
          {t('header.user.signout')}
        </span>
      </Menu.Item>
    </Menu>
  );
};

export const languagesList = (toggleLanguage: (code: string) => void) => {
  return (
    <Menu
      style={{
        height: '400px',
        overflowY: 'scroll',
      }}
    >
      {languages.map((lang) => (
        <Menu.Item
          key={lang.code}
          onClick={() => toggleLanguage(lang.code)}
          style={{
            padding: '0.5rem 1.25rem',
          }}
        >
          <span>{lang.text}</span>
        </Menu.Item>
      ))}
    </Menu>
  );
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
