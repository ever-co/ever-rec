import { sendWorkspaceInviteLinkAPI } from './api/email';
import { iDataResponseParser } from './helpers/iDataResponseParser';

export const sendWorkspaceInviteLink = async (
  emails: string[],
  inviteId: string,
  inviterDisplayName: string,
) => {
  const response = await sendWorkspaceInviteLinkAPI(
    emails,
    inviteId,
    inviterDisplayName,
  );
  const data = iDataResponseParser(response, false);
  return data;
};
