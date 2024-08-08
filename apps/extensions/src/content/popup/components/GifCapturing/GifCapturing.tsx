import React from 'react';

interface IGifContainerProps {
  capturingTime: string;
  onStopGif: () => void;
}

const GifContainer: React.FC<IGifContainerProps> = ({
  capturingTime,
  onStopGif,
}) => {
  return (
    <div className="tw-p-6 tw-bg-blue-grey">
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-rounded-lg tw-bg-white">
        <h2 className="tw-mb-0 tw-mt-3 tw-font-bold tw-text-lg">
          {capturingTime}
        </h2>
        <hr className="tw-w-full tw-h-1 tw-my-3" />
        <div className="tw-mb-5 tw-flex tw-w-350px tw-justify-evenly">
          <img
            src={chrome.runtime.getURL(
              `./images/contentImages/recordingWindowIcons/button-stop-red-fill.svg`,
            )}
            className="tw-cursor-pointer"
            onClick={onStopGif}
          />
        </div>
      </div>
    </div>
  );
};

export default GifContainer;
