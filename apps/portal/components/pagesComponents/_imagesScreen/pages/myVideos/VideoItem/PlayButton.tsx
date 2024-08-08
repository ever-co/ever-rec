import { FC } from 'react';
import AppSvg from 'components/elements/AppSvg';

const PlayButton: FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 'calc(50% - 27.5px)',
      top: 'calc(50% - 27.5px)',
    }}
  >
    <AppSvg path="/videos/play-button.svg" />
  </div>
);

export default PlayButton;
