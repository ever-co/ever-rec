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
  // One request of each kind at a time: the effect below runs again while an answer is on its way.
  const listInFlight = useRef(false);
  const workspaceInFlight = useRef<string | null>(null);
  // Whose list of workspaces has arrived. The store starts with an empty list, so the list itself
  // cannot tell "none" from "not asked yet".
  const listLoadedFor = useRef<string | null>(null);

  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const workspaces = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const workspaceLoaded = useSelector(
    (state: RootStateOrAny) => state.panel?.workspaceFetched,
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

      const request = `${workspaceIdQuery}|${folderIdQuery || ''}`;
      if (workspaceInFlight.current === request) return;
      workspaceInFlight.current = request;

      dispatch(PanelAC.setWorkspaceFetched({ workspaceFetched: false }));
      dispatch(PanelAC.setWorkspaceLoaded({ workspaceLoaded: false }));

      try {
        const response = await getFullWorkspaceDataAPI(
          workspaceIdQuery,
          typeof folderIdQuery === 'string'
            ? (folderIdQuery as string)
            : undefined,
        );

        console.log('response:', response);
        const data = iDataResponseParser<typeof response.data>(response);

        if (data) {
          dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: data }));
          dispatch(PanelAC.setWorkspaceLoaded({ workspaceLoaded: true }));
          dispatch(PanelAC.setWorkspaceFetched({ workspaceFetched: true }));
          dispatch(PanelAC.setFavoriteFolders({ folders: data.favFolders }));
        }
      } finally {
        workspaceInFlight.current = null;
      }
    };

    console.log('workspaces:', workspaces);

    const fetchWorkspaces = async () => {
      if (listInFlight.current) return;
      listInFlight.current = true;

      try {
        const response = await getUserWorkspacesAPI();
        dispatch(PanelAC.setWorkspaceFetched({ workspaceFetched: true }));
        if (response.status !== ResStatusEnum.error) {
          listLoadedFor.current = user?.id ?? null;
          const userWorkspaces = response.data;
          dispatch(PanelAC.setWorkspaces({ workspaces: userWorkspaces || [] }));
        } else {
          errorHandler({ message: response.message });
        }
      } finally {
        listInFlight.current = false;
      }
    };

    const routerHasWorkspaceId = router.query['workspaceId'] && router.isReady;

    const idQueryEqualsActiveWorkspaceId =
      workspaceIdQuery === activeWorkspace?.id;

    const workspacesExist = Array.isArray(workspaces);

    // The one flag (`workspaceFetched`) is set by whichever answer comes first, so on its own it
    // lets the other request be skipped for good:
    // - the list came back before the router had the workspace id: the workspace was never asked
    //   for and its page stayed on the spinner;
    // - the workspace came back before the signed-in person was known: the list was never asked
    //   for and the switcher stayed empty.
    // So each request is also made when its own data is missing.
    const workspaceMissing =
      routerHasWorkspaceId && !idQueryEqualsActiveWorkspaceId;
    const listMissing =
      !workspacesExist || (!!user && listLoadedFor.current !== user.id);

    if (
      ((routerHasWorkspaceId || !idQueryEqualsActiveWorkspaceId) &&
        !workspaceLoaded) ||
      workspaceMissing
    ) {
      fetched.current = true;
      fetchFullWorkspaceData();
    }

    if (user && (!workspaceLoaded || listMissing)) {
      fetched.current = true;
      fetchWorkspaces();
    }
  }, [router.isReady, router.query, user, fetched, dispatch, workspaces]);
};

export default useFetchWorkspacesData;
