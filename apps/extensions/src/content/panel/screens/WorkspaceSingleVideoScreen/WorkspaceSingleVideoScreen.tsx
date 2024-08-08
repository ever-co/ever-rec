import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { useSelector, RootStateOrAny } from 'react-redux';
import VideoEditorScreen from '../videoEditorScreen/VideoEditorScreen';

const WorkspaceSingleVideoScreen = () => {
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );

  return <VideoEditorScreen isWorkspace workspace={activeWorkspace} />;
};

export default WorkspaceSingleVideoScreen;
