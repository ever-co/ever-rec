import { IDataResponse } from 'app/interfaces/IApiResponse';
import { ItemType } from 'app/interfaces/ItemType';
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

const sendWelcomeEmailAPI = (email: string): Promise<any> => {
  return api.post('/api/v1/email/send-welcome-email', { email });
};

const sendEmailResetPasswordAPI = (email: string): Promise<IDataResponse> => {
  return api.post(`/api/v1/email/reset-password-email`, { email });
};

const verifyPasswordResetCodeAPI = (
  oobCode: string,
): Promise<IDataResponse> => {
  return api.post(`/api/v1/email/verify-code`, { oobCode });
};

const newPasswordAPI = (
  oobCode: string,
  newPassword: string,
): Promise<IDataResponse> => {
  return api.post(`/api/v1/email/new-password`, { oobCode, newPassword });
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

export {
  sendItemToEmail,
  sendWelcomeEmailAPI,
  sendEmailResetPasswordAPI,
  verifyPasswordResetCodeAPI,
  newPasswordAPI,
  sendWorkspaceInviteLinkAPI,
};
