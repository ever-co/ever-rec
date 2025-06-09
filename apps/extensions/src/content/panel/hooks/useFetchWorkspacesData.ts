import PanelAC from '@/app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { useEffect } from 'react';
import {
  getFullWorkspaceDataAPI,
  getUserWorkspacesAPI,
} from '@/app/services/api/workspace';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import { IAppMessage } from '@/app/messagess';
import { panelRoutes } from '../router/panelRoutes';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { errorHandler } from '@/app/services/helpers/errors';
import { IUser } from '@/app/interfaces/IUserData';
import { useTranslation } from 'react-i18next';

const useFetchWorkspacesData = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const folder = searchParams.get('folder');
  const workspaceId = searchParams.get('workspaceId');
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const workspaces = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );

  // TODO:
  // BUT: We really don't want to fetch all the data at once, a pagination must be included, which makes storing
  // data in redux a bit (much) more complicated. Do it as an decoration/optimization after the main work has been done.
  useEffect(() => {
    const workspaceIdQuery = workspaceId ? (workspaceId as string) : null;
    const folderIdQuery = folder ? (folder as string) : false;

    const fetchFullWorkspaceData = async () => {
      if (workspaceIdQuery) {
        dispatch(PanelAC.setWorkspaceLoaded({ workspaceLoaded: false }));

        const response = await getFullWorkspaceDataAPI(
          workspaceIdQuery,
          typeof folderIdQuery === 'string'
            ? (folderIdQuery as string)
            : undefined,
        );

        const data = iDataResponseParser<typeof response.data>(response);

        if (data) {
          dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: data }));
          dispatch(PanelAC.setWorkspaceLoaded({ workspaceLoaded: true }));
          dispatch(PanelAC.setFavoriteFolders({ folders: data.favFolders }));
        }
      }
    };

    const fetchWorkspaces = async () => {
      if (!workspaces || workspaces.length === 0) {
        const response = await getUserWorkspacesAPI();

        if (response.status !== ResStatusEnum.error) {
          const userWorkspaces = response.data;

          dispatch(
            PanelAC.setWorkspaces({
              workspaces: userWorkspaces as IWorkspace[],
            }),
          );
        } else {
          errorHandler({ message: response.message });
        }
      }
    };

    if (
      (location.search.includes('workspaceId') ||
        workspaceIdQuery !== activeWorkspace?.id) &&
      workspaces.length > 0
    ) {
      fetchFullWorkspaceData();
    }

    if (workspaces.length === 0 && user) {
      fetchWorkspaces();
    }
  }, [workspaceId, searchParams, workspaces, user]);

  useEffect(() => {
    chrome.runtime.onMessageExternal.addListener(externalCredentialListener);

    return () =>
      chrome.runtime.onMessageExternal.removeListener(
        externalCredentialListener,
      );
  }, []);

  async function externalCredentialListener(message: IAppMessage) {
    try {
      if (message.action === 'setActiveWorkspace') {
        const workspaceId = message.payload?.workspaceId;

        if (workspaceId) {
          navigate(`${panelRoutes.workspace.path}?id=${workspaceId}`);
          successMessage(t('ext.joinedWorkspace'));
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
};

export default useFetchWorkspacesData;
