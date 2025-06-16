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
    <div className="tw-flex tw-flex-col tw-h-screen">
      <TopMenuBar user={user} />
      <div
        className={classNames(
          'tw-w-full default:tw-px-2 sm:tw-px-2 md:tw-px-2 lg:tw-px-2 xl:tw-px-12 2xl:tw-px-32',
          'workspace-invite',
          'tw-h-full tw-pt-32',
        )}
      >
        {workspaceInviter && workspaceName && (
          <div className="tw-flex tw-flex-col tw-items-center">
            <h1 className="tw-font-semibold tw-text-3xl tw-tracking-wide tw-text-center">
              {workspaceInviter} {t('workspace.invitedToJoin')}
            </h1>
            <h1 className="tw-font-extrabold tw-text-3xl tw-tracking-wide tw-text-center">
              {t('workspace.workspace')}
              <span className="tw-text-primary-purple">
                {workspaceName}
              </span>{' '}
              {t('common.no')}
              Rec.
            </h1>
            <p className="tw-pt-6 tw-pb-2 tw-text-2xl tw-text-primary-purple tw-font-extrabold">
              {workspaceName}
            </p>
            <AppButton
              twTextSize="tw-text-lg"
              twPadding="tw-px-32 tw-py-3"
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
            <h1 className="tw-font-semibold tw-text-3xl tw-tracking-wide tw-text-center">
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
          <div className="tw-flex tw-justify-center tw-mb-2 tw-w-2/4 tw-flex-wrap tw-min-w-330px">
            {workspaceMembers.map((m, i) => {
              if (i > maxVisibleMembers - 1) return null;
              return (
                <AppSvg
                  key={i}
                  path="/sign/default-profile.svg"
                  size="70px"
                  className="tw-flex tw-justify-center tw-content-center tw-m-4"
                />
              );
            })}
          </div>
          <WorkspaceMemberNames workspaceMembers={workspaceMembers} />
        </div>
      ) : (
        <div className="tw-flex tw-flex-col tw-items-center">
          <div className="tw-flex tw-justify-center tw-mb-2 tw-w-4/5 tw-flex-wrap">
            {workspaceMembers.map((w, i) => (
              <AppSvg
                key={i}
                path="/sign/default-profile.svg"
                size="70px"
                className="tw-flex tw-justify-center tw-content-center tw-m-4"
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
      <p className="tw-text-center tw-max-w-400px">
        {memberNamesAndLastMember + ' '}
        {t('workspace.joined')}
      </p>
    );
  }

  return (
    <p className="tw-text-center tw-max-w-400px">
      <Trans
        i18nKey="workspace.others"
        values={{ members: memberNamesAndOthers }}
      />
    </p>
  );
};
