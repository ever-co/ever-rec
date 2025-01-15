import { useEffect } from 'react';
import { IUser } from 'app/interfaces/IUserData';
import { updateUserDataFromTokens } from 'app/services/auth';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import AuthAC from 'store/auth/actions/AuthAC';
import PanelAC from 'app/store/panel/actions/PanelAC';

/** To be used with single pages that on browser reload will lose their user because there is no container component for authentication like index.tsx */
const useAuthenticateUser = () => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) return;

    const updateUser = async () => {
      const user: IUser | null = await updateUserDataFromTokens();
      if (!user) return;

      dispatch(AuthAC.setUser({ user }));

      user.favoriteFolders &&
        dispatch(
          PanelAC.setFavoriteFolders({
            folders: {
              images: user.favoriteFolders.images || {},
              videos: user.favoriteFolders.videos || {},
              workspaces: user.favoriteFolders.workspaces || {},
            },
          }),
        );
    };

    updateUser();
  }, [user, dispatch]);

  return user;
};

export default useAuthenticateUser;
