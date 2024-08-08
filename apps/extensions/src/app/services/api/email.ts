import { IDataResponse } from '@/app/interfaces/IDataResponse';
import api from './api';

const sendItemToEmail = ({
  emails,
  itemLink,
  itemType,
  itemPublicLink,
  message,
  userDisplayName,
  templateUrl,
}: {
  emails: string[];
  itemLink: string;
  itemType: string;
  itemPublicLink: string;
  message: string | undefined;
  userDisplayName: string | null;
  templateUrl: string | false;
}): Promise<any> => {
  return api.post('/api/v1/email/send-item', {
    emails,
    itemLink,
    itemType,
    itemPublicLink,
    message,
    userDisplayName,
    templateUrl,
  });
};

const sendWorkspaceInviteLinkAPI = (
  emails: string[],
  inviteId: string,
  inviterDisplayName: string,
): Promise<IDataResponse<string>> => {
  return api.post(`/api/v1/email/send-workspace-invite-email`, {
    emails,
    inviteId,
    inviterDisplayName,
  });
};

export { sendItemToEmail, sendWorkspaceInviteLinkAPI };
