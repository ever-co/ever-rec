import { ReactElement } from 'react';

interface IPageMenuItems {
  type: string; // overwritten
  title: string;
  icon: ReactElement;
  route: string;
  isWorkspaceRoute?: boolean;
}

export default IPageMenuItems;
