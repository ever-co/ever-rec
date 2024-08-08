import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { createWorkspaceInviteLink } from 'app/services/workspace';
import PanelAC from 'app/store/panel/actions/PanelAC';
import {
  errorMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { IWorkspace } from 'app/interfaces/IWorkspace';

interface IProps {
  workspace: IWorkspace;
  visible: boolean;
}

const useShareWorkspaceInviteModal = ({ workspace, visible }: IProps) => {
  const dispatch = useDispatch();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!workspace?.inviteLinkId || !visible) return;

    const inviteLinkId = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/workspace/invite/${workspace?.inviteLinkId}`;

    setLink(inviteLinkId);
  }, [workspace?.inviteLinkId, visible]);

  // We don't know when the user will copy something else,
  // so lets have copied state go back to default after some delay
  useEffect(() => {
    if (!copied) return;

    const timeout = setTimeout(() => setCopied(false), 4000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const primaryButtonClickHandler = async () => {
    if (link) return copyLink(link);

    const data = await createWorkspaceInviteLink(workspace.id);

    if (!data) return errorMessage('Could not create workspace invite link.');

    const id = data.id;
    const inviteLink = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/workspace/invite/${id}`;

    setLink(inviteLink);
    copyLink(inviteLink);

    // Update workspaces global state with new inviteLinkId so we don't have to refetch
    const updatedWorkspace = workspace;
    updatedWorkspace.inviteLinkId = id;
    dispatch(PanelAC.updateWorkspaces({ workspace: updatedWorkspace }));
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);

      setCopied(true);
      successMessage('Copied!');
    } catch (err) {
      setCopied(false);
      errorMessage('Could not copy.');
    }
  };

  return {
    link,
    copied,
    setLink,
    setCopied,
    primaryButtonClickHandler,
  };
};

export default useShareWorkspaceInviteModal;
