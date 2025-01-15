import React from 'react';
import '@/content/content';
import './video-camera.scss';
import Draggable from 'react-draggable';

const DraggableReact = Draggable as any;

interface IVideoCameraProps {
  vRef: any;
}

const VideoCamera: React.FC<IVideoCameraProps> = ({ vRef }) => {
  const isInOurEditor = window.location.pathname.includes('/edit');

  return (
    <DraggableReact
      defaultPosition={{ x: isInOurEditor ? 100 : 0, y: -window.innerHeight }}
      bounds={{
        top: -window.innerHeight,
        left: 0,
        right: window.innerWidth - 220,
        bottom: -220,
      }}
    >
      <div className="video-container-main">
        <video
          className="video-container"
          ref={vRef}
          autoPlay={true}
          muted={true}
          playsInline={true}
        ></video>
      </div>
    </DraggableReact>
  );
};

export default VideoCamera;
