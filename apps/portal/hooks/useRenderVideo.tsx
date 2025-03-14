import { useMemo } from 'react';
import PlyrPlayer from 'components/shared/plyrPlayer/PlyrPlayer';

type RenderVideoRenderProps = {
  renderVideo: JSX.Element;
};

type RenderVideoHookProps = {
  urlLink: string;
};

const useRenderVideo = ({
  urlLink,
}: RenderVideoHookProps): RenderVideoRenderProps => {
  const renderVideo = useMemo(
    () => (
      <div style={{ width: '100%', aspectRatio: '16 / 9' }}>
        <PlyrPlayer videoURL={urlLink} />
      </div>
    ),
    [urlLink],
  );

  return {
    renderVideo,
  };
};

export default useRenderVideo;
