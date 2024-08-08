import useFetchWorkspacesData from '@/content/panel/hooks/useFetchWorkspacesData';

// put here functionality that has to run wrapper on the whole project, but also needs router to work.
const PanelRoutesWrapper = () => {
  useFetchWorkspacesData();

  return null;
};

export default PanelRoutesWrapper;
