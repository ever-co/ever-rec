import { useEffect, useRef } from 'react';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import {
  getFullWorkspaceDataAPI,
  getUserWorkspacesAPI,
} from 'app/services/api/workspace';
import PanelAC from '../app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import { errorHandler } from 'app/services/helpers/errors';
import { IUser } from 'app/interfaces/IUserData';

const useFetchWorkspacesData = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const fetched = useRef(false);

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
    const { workspaceId, folder } = router.query;
    const workspaceIdQuery = workspaceId ? (workspaceId as string) : null;
    const folderIdQuery = folder ? (folder as string) : false;

    const fetchFullWorkspaceData = async () => {
      if (!workspaceIdQuery) return;

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
    };

    const fetchWorkspaces = async () => {
      if (!workspaces || workspaces.length === 0) {
        const response = await getUserWorkspacesAPI();
        if (response.status !== ResStatusEnum.error) {
          const userWorkspaces = response.data;
          dispatch(PanelAC.setWorkspaces({ workspaces: userWorkspaces || [] }));
        } else {
          errorHandler({ message: response.message });
        }
      }
    };

    const routerHasWorkspaceId = router.query['workspaceId'] && router.isReady;

    const idQueryEqualsActiveWorkspaceId =
      workspaceIdQuery === activeWorkspace?.id;

    const workspacesExist = workspaces.length > 0;

    if (
      (routerHasWorkspaceId || !idQueryEqualsActiveWorkspaceId) &&
      workspacesExist &&
      !fetched.current
    ) {
      fetched.current = true;
      fetchFullWorkspaceData();
    }

    if (!workspacesExist && user && !fetched.current) {
      fetched.current = true;
      fetchWorkspaces();
    }
  }, [router.isReady, router.query, user, fetched, dispatch, workspaces]);
};

export default useFetchWorkspacesData;
