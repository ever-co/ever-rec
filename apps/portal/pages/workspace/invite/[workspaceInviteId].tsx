import React, { FC, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getWorkspaceInviteData,
  joinWorkspaceWithInvite,
} from 'app/services/workspace';
import { successMessage } from 'app/services/helpers/toastMessages';
import TopMenuBar from 'components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar';
// import AppContainer from 'components/containers/appContainer/AppContainer';
import AppButton from 'components/controls/AppButton';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';
import { sendExternalMessage } from 'misc/_helper';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { panelRoutes, preRoutes } from 'components/_routes';
import { Trans, useTranslation } from 'react-i18next';

const maxVisibleMembers = 6;

const WorkspaceInvite: FC<any> = () => {
  const { t } = useTranslation();
  const user = useAuthenticateUser();
  const router = useRouter();
  const [workspaceInviteId, setWorkspaceInviteId] = useState<string | null>(
    null,
  );
  const [workspaceInviter, setWorkspaceInviter] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const setWorkspaceInviteState = useCallback(async () => {
    const { workspaceInviteId } = router.query;

    if (workspaceInviteId && typeof workspaceInviteId === 'string') {
      setWorkspaceInviteId(workspaceInviteId);

      setLoading(true);
      const data = await getWorkspaceInviteData(workspaceInviteId);

      if (!data) {
        setError(true);
        setLoading(false);
        return;
      }

      setWorkspaceInviter(data.workspaceInviter);
      setWorkspaceName(data.workspaceName);
      setWorkspaceMembers(data.workspaceMembers);
      setLoading(false);
    }
  }, [router.query]);

  useEffect(() => {
    if (!router.isReady) return;

    setWorkspaceInviteState();
  }, [router.isReady, setWorkspaceInviteState]);

  const joinWorkspaceHandler = async () => {
    if (!workspaceInviteId) return;
    if (!user) {
      router.push(
        `${preRoutes.auth}${panelRoutes.login}?workspaceInvite=${workspaceInviteId}`,
      );
      return;
    }

    const data = await joinWorkspaceWithInvite(workspaceInviteId);
    if (data && data.hasAlreadyJoined) {
      router.push(`/media/workspace/${data.workspaceId}`);
    } else if (data) {
      successMessage(t('toasts.joinedWorkspaceSuccess'));

      sendExternalMessage('setActiveWorkspace', data);

      setTimeout(() => {
        router.push(`/media/workspace/${data.workspaceId}`);
      }, 1000);
    }
  };

  return (
    <div className="tw-flex tw-h-screen tw-flex-col tw-bg-background">
      <TopMenuBar user={user} />
      <div
        className={classNames(
          'tw-w-full default:tw-px-2 sm:tw-px-2 md:tw-px-2 lg:tw-px-2 xl:tw-px-12 2xl:tw-px-32',
          'workspace-invite',
          'tw-flex tw-flex-1 tw-flex-col tw-justify-center tw-overflow-y-auto tw-py-12',
        )}
      >
        {/* The inviter is empty when that account was deleted: the invite still works. */}
        {workspaceName && (
          <div className="tw-flex tw-flex-col tw-items-center">
            {workspaceInviter && (
              <h1 className="tw-m-0 tw-text-center tw-text-2xl tw-font-semibold tw-text-foreground">
                {workspaceInviter} {t('workspace.invitedToJoin')}
              </h1>
            )}
            <h1 className="tw-m-0 tw-text-center tw-text-2xl tw-font-semibold tw-text-foreground">
              {/* The name is escaped so Trans never reads it as markup, then shown as typed. */}
              <Trans
                i18nKey="workspace.joinWorkspaceOnRec"
                values={{ workspaceName }}
                components={{ 1: <span className="tw-text-primary-purple" /> }}
                tOptions={{ interpolation: { escapeValue: true } }}
                shouldUnescape
              />
            </h1>
            <p className="tw-m-0 tw-mt-2 tw-text-sm tw-text-muted-foreground">
              {workspaceName}
            </p>
            <AppButton
              twPadding="tw-px-8"
              className="tw-mt-6 tw-flex tw-h-10 tw-items-center tw-justify-center"
              onClick={joinWorkspaceHandler}
            >
              {t('workspace.joinNow')}
            </AppButton>
            {workspaceMembers.length > 1 && (
              <div className="tw-pt-4">
                {<WorkspaceMembers workspaceMembers={workspaceMembers} />}
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="tw-flex tw-flex-col tw-items-center">
            <h1 className="tw-m-0 tw-text-center tw-text-xl tw-font-semibold tw-text-foreground">
              {t('workspace.workspaceInviteExpired')}
            </h1>
          </div>
        )}
      </div>

      <AppSpinner show={loading} />
    </div>
  );
};

export default WorkspaceInvite;

// todo: export below
interface WorkspaceMembers {
  workspaceMembers: string[];
}

const WorkspaceMembers: FC<any> = ({ workspaceMembers }) => {
  const membersLength = workspaceMembers.length;

  if (membersLength <= 1) return null;

  return (
    <div className="tw-pt-4">
      {membersLength >= maxVisibleMembers - 1 ? (
        <div className="tw-flex tw-flex-col tw-items-center">
          <div className="tw-mb-3 tw-flex tw-w-2/4 tw-min-w-330px tw-flex-wrap tw-justify-center">
            {workspaceMembers.map((m, i) => {
              if (i > maxVisibleMembers - 1) return null;
              return (
                <AppSvg
                  key={i}
                  path="/sign/default-profile.svg"
                  size="48px"
                  className="tw-m-1 tw-flex tw-content-center tw-justify-center"
                />
              );
            })}
          </div>
          <WorkspaceMemberNames workspaceMembers={workspaceMembers} />
        </div>
      ) : (
        <div className="tw-flex tw-flex-col tw-items-center">
          <div className="tw-mb-3 tw-flex tw-w-4/5 tw-flex-wrap tw-justify-center">
            {workspaceMembers.map((w, i) => (
              <AppSvg
                key={i}
                path="/sign/default-profile.svg"
                size="48px"
                className="tw-m-1 tw-flex tw-content-center tw-justify-center"
              />
            ))}
          </div>
          <WorkspaceMemberNames workspaceMembers={workspaceMembers} />
        </div>
      )}
    </div>
  );
};

const WorkspaceMemberNames: FC<any> = ({ workspaceMembers }) => {
  const { t } = useTranslation();
  const membersLength = workspaceMembers.length;

  const memberNamesAndLastMember =
    workspaceMembers.slice(0, workspaceMembers.length - 1).join(', ') +
    ` ${t('page.register.terms.and')} ` +
    workspaceMembers.slice(-1)[0];

  const memberNamesAndOthers =
    workspaceMembers.slice(0, maxVisibleMembers - 1).join(', ') +
    ', ' +
    workspaceMembers.slice(-1)[0];

  if (membersLength <= maxVisibleMembers) {
    return (
      <p className="tw-m-0 tw-max-w-400px tw-text-center tw-text-sm tw-text-muted-foreground">
        {memberNamesAndLastMember + ' '}
        {t('workspace.joined')}
      </p>
    );
  }

  return (
    <p className="tw-m-0 tw-max-w-400px tw-text-center tw-text-sm tw-text-muted-foreground">
      <Trans
        i18nKey="workspace.others"
        values={{ members: memberNamesAndOthers }}
      />
    </p>
  );
};
