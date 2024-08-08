import { FC } from 'react';
import SingleVideoPage from 'pages/video/[id]';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { RootStateOrAny, useSelector } from 'react-redux';

const WorkspaceSingleVideoPage: FC = () => {
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );

  return <SingleVideoPage isWorkspace activeWorkspace={activeWorkspace} />;
};

export default WorkspaceSingleVideoPage;
