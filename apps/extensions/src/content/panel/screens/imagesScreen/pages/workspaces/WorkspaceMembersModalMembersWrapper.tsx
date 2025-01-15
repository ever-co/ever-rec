import React, { FC } from 'react';
import { IWorkspaceUser } from '@/app/interfaces/IWorkspace';
import AppSpinnerLocal from '@/content/components/containers/appSpinnerLocal/AppSpinnerLocal';
import AppButton from '@/content/components/controls/appButton/AppButton';
import classNames from 'classnames';
import * as styles from './WorkspaceMembersModalMembersWrapper.module.scss';
import { IMemberLoadingIds } from './WorkspaceMembersModalWrapper';

export const sortByEmail = (a: IWorkspaceUser, b: IWorkspaceUser) => {
  if (!a.email || !b.email) return 0;

  return a.email.localeCompare(b.email);
};

interface IProps {
  teamId?: string;
  teamAdminId?: string;
  teamMembers?: IWorkspaceUser[];
  members: IWorkspaceUser[];
  membersLoading?: IMemberLoadingIds;
  addButton?: boolean;
  removeButton?: boolean;
  onAdd?: (teamId?: string, memberId?: string) => void;
  onRemove?: (teamId?: string, memberId?: string) => void;
}

const WorkspaceMembersModalMembersWrapper: FC<IProps> = ({
  teamId,
  teamAdminId,
  teamMembers = [],
  members,
  membersLoading = {},
  addButton = false,
  removeButton = false,
  onAdd,
  onRemove,
}) => {
  const teamMemberIds = teamMembers.map((member) => member.id);
  const membersLoadingIds =
    teamId && membersLoading[teamId] ? [...membersLoading[teamId]] : [];

  let adminIndex = null;
  const rowElements = members.sort(sortByEmail).map((member, index) => {
    const isTeamAdmin = teamAdminId === member.id;
    const isInTeam = teamMemberIds.includes(member.id);
    const isLoading = membersLoadingIds.includes(member.id);

    if (isTeamAdmin) {
      adminIndex = index;
    }

    let photoURL = member?.photoURL;
    if (!photoURL || photoURL === '') {
      photoURL = '/images/panel/sign/default-profile.svg';
    }

    return (
      <MemberRow
        key={member.id}
        teamId={teamId}
        member={member}
        members={members}
        photoURL={photoURL}
        isTeamAdmin={isTeamAdmin}
        isInTeam={isInTeam}
        isLoading={isLoading}
        addButton={addButton}
        removeButton={removeButton}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    );
  });

  // Put Team Admin on top
  let adminElement: any = null;
  if (adminIndex !== null) {
    adminElement = rowElements.splice(adminIndex, 1);
  }
  adminElement && rowElements.unshift(adminElement);

  return (
    <div className={classNames(styles.MembersWrapper, 'scroll-div')}>
      {rowElements}
    </div>
  );
};

interface IMemberRow extends Omit<IProps, 'teamAdminId'> {
  photoURL: string;
  isTeamAdmin: boolean;
  isLoading: boolean;
  isInTeam: boolean;
  member: IWorkspaceUser;
}

const MemberRow: FC<IMemberRow> = ({
  teamId,
  members,
  member,
  photoURL,
  isTeamAdmin,
  isInTeam,
  isLoading,
  addButton,
  removeButton,
  onAdd,
  onRemove,
}) => {
  return (
    <div
      key={member.id}
      className={classNames(styles.MemberRow, members.length > 8 && 'tw-mr-2')}
    >
      <div>
        <img src={photoURL} alt="" />

        <div className={styles.MemberInfo}>
          <span>{member?.displayName}</span>
          <span>{member?.email}</span>
        </div>
      </div>

      {addButton && !isInTeam && (
        <AppButton
          onClick={() => !isLoading && onAdd && onAdd(teamId, member.id)}
          bgColor="tw-bg-primary-purple"
          className={styles.MemberButton}
        >
          {isLoading ? (
            <div className={styles.spinnerWrapper}>
              <AppSpinnerLocal />
            </div>
          ) : (
            'Add'
          )}
        </AppButton>
      )}

      {removeButton && isInTeam && !isTeamAdmin && (
        <AppButton
          onClick={() => !isLoading && onRemove && onRemove(teamId, member.id)}
          bgColor="tw-bg-app-grey-darker"
          twTextColor="tw-text-white"
          className={styles.MemberButton}
        >
          {isLoading ? (
            <div className={styles.spinnerWrapper}>
              <AppSpinnerLocal
                circleInnerColor="#6e6e6e"
                circleColor="#ffffff"
              />
            </div>
          ) : (
            'Remove'
          )}
        </AppButton>
      )}

      {isTeamAdmin && (
        <div>
          <i>Team Owner</i>
        </div>
      )}
    </div>
  );
};

export default WorkspaceMembersModalMembersWrapper;
