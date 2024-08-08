import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import {
  errorMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import { createWorkspaceInviteLink } from '@/app/services/workspace';
import PanelAC from '@/app/store/panel/actions/PanelAC';

interface IProps {
  workspace: IWorkspace | null;
  visible: boolean;
}

const useShareWorkspaceInviteModal = ({ workspace, visible }: IProps) => {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    if (!workspace?.inviteLinkId || !visible) return;

    const inviteLinkId = `${process.env.WEBSITE_URL}/workspace/invite/${workspace?.inviteLinkId}`;

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
    if (!workspace) return;
    if (link) return copyLink(link);

    const data = await createWorkspaceInviteLink(workspace.id);

    if (data) {
      const id = data.id;
      const inviteLink = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/workspace/invite/${id}`;

      setLink(inviteLink);
      copyLink(inviteLink);

      // Update workspaces global state with new inviteLinkId so we don't have to refetch
      const updatedWorkspace = workspace;
      updatedWorkspace.inviteLinkId = id;
      dispatch(PanelAC.updateWorkspaces({ workspace: updatedWorkspace }));
    }
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
    copied,
    setCopied,
    link,
    setLink,
    primaryButtonClickHandler,
  };
};

export default useShareWorkspaceInviteModal;
