import { FC } from 'react';
import { Play } from 'lucide-react';

// The play mark over a video thumbnail. It sits over media: dark with light ink in both themes.
const PlayButton: FC = () => (
  <div
    className="tw-flex tw-size-11 tw-items-center tw-justify-center tw-rounded-full tw-bg-[hsl(var(--overlay)/0.6)] tw-text-[hsl(var(--on-overlay))]"
    style={{
      position: 'absolute',
      left: 'calc(50% - 22px)',
      top: 'calc(50% - 22px)',
    }}
  >
    <Play
      className="tw-ml-0.5 tw-size-5 tw-fill-current"
      strokeWidth={1.5}
      aria-hidden="true"
    />
  </div>
);

export default PlayButton;
