import MainScreen from '../screens/mainScreen/MainScreen';
import { PanelRoute, PanelRoutesNames } from './panel.route';
import store from '@/app/store/panel';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import EditorScreen from '../screens/editorScreen/EditorScreen';

export const panelRoutes: PanelRoute[] = [
  {
    name: PanelRoutesNames.main,
    screen: MainScreen,
  },
  {
    name: PanelRoutesNames.edit,
    screen: EditorScreen,
  },
];

export function panelRoute({
  name,
}: {
  name: PanelRoutesNames;
}): PanelRoute | undefined {
  return panelRoutes.find((r) => r.name === name);
}

export function setPanelRoute({ name }: { name: PanelRoutesNames }): void {
  const route: PanelRoute | undefined = panelRoute({ name });
  route && store.dispatch(PanelAC.setActiveRoute({ activeRoute: route }));
}
