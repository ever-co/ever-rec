import { FC } from 'react';

export interface AppRoute {
  name: string;
  screen: FC;
  private?: boolean;
  hideAuthenticated?: boolean;
}
