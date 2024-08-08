import React, { useEffect } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { PanelRoute, PanelRoutesNames } from './panel.route';
import { setPanelRoute } from './routes';
import { IUser } from '@/app/interfaces/IUserData';

const PanelRouter: React.FC = () => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const activeRoute: PanelRoute = useSelector(
    (state: RootStateOrAny) => state.panel.activeRoute,
  );

  useEffect(() => {
    if (activeRoute.private && !user) {
      setPanelRoute({ name: PanelRoutesNames.main });
    }
  }, [user, activeRoute]);

  return activeRoute ? React.createElement(activeRoute.screen) : null;
};

export default PanelRouter;
