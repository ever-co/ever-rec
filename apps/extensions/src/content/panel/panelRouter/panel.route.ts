import { FC } from 'react';

export interface PanelRoute {
  name: PanelRoutesNames;
  screen: FC;
  private?: boolean;
}

export enum PanelRoutesNames {
  main,
  screenshots,
  edit,
  signIn,
  grand,
}
