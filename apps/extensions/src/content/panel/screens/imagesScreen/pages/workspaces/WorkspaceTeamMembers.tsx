import React, { FC } from 'react';
import classNames from 'classnames';
import styles from './WorkspaceTeamMembers.module.scss';
import { IWorkspaceUser } from '@/app/interfaces/IWorkspace';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import { sortByEmail } from './WorkspaceMembersModalMembersWrapper';

interface IProps {
  isWorkspace?: boolean;
  team: IWorkspaceTeam | null;
  teamMembers: IWorkspaceUser[] | null;
  teamMemberCount: number;
  onMembersClick: (
    teamId?: string,
    teamName?: string,
    teamAdminId?: string,
  ) => void;
}

const WorkspaceTeamMembers: FC<IProps> = ({
  isWorkspace = false,
  team,
  teamMembers,
  teamMemberCount,
  onMembersClick,
}) => {
  let numberOfPhotos = 3;
  if (isWorkspace) numberOfPhotos = 5;

  let memberIcons = null;
  if (teamMembers) {
    memberIcons = teamMembers.sort(sortByEmail).map((member, index: number) => {
      if (index > numberOfPhotos - 1) return null;

      const photoURL = member?.photoURL;
      if (!photoURL) {
        return (
          <img
            key={member.id}
            src="/images/panel/sign/default-profile.svg"
            alt=""
          />
        );
      }

      return <img key={member.id} src={member.photoURL} alt="" />;
    });
  }

  const clickHandler = () => {
    if (team) {
      onMembersClick(team.id, team.name, team.admin);
      return;
    }

    onMembersClick();
  };

  const memberString = teamMemberCount > 1 ? 'members' : 'member';

  return (
    <div
      className={classNames(
        styles.WorkspaceTeamMembers,
        !teamMembers && styles.loading,
        isWorkspace && styles.isWorkspace,
      )}
      onClick={clickHandler}
    >
      {teamMembers && (
        <>
          <div
            className={classNames(
              styles.MemberPhotoStack,
              isWorkspace && styles.isWorkspace,
            )}
          >
            {memberIcons}
          </div>
          {teamMemberCount > 0 && (
            <span>
              {teamMemberCount} {memberString}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default WorkspaceTeamMembers;
