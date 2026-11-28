import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { signOut } from 'app/services/auth';
import AuthAC from 'store/auth/actions/AuthAC';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { panelRoutes, preRoutes } from 'components/_routes';

/** Signs the person out, clears what the app holds about them and goes to the sign-in page. */
const useSignOut = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  return useCallback(() => {
    signOut();

    dispatch(AuthAC.setUser({ user: null }));
    dispatch(PanelAC.resetExplorerDataLoader());
    dispatch(PanelAC.resetExplorerDataLoaderVideos());
    dispatch(PanelAC.resetWorkspaces());

    router.push(preRoutes.auth + panelRoutes.login);
  }, [dispatch, router]);
};

export default useSignOut;
