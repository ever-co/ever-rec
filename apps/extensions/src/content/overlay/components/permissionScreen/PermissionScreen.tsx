import React from 'react';
import '@/content/content';
import './permission-screen.scss';
import browser from '@/app/utilities/browser';

interface IPermissionScreenProps {
  blocked: boolean;
  changeBlocked: () => void;
}

const PermissionScreen: React.FC<IPermissionScreenProps> = ({
  blocked,
  changeBlocked,
}) => {
  const handleClick = () => {
    blocked && changeBlocked();
  };

  return (
    <div>
      <div className="countdown-container" onClick={handleClick}></div>
      {!blocked ? (
        <div className="img-container">
          <img
            src={browser.runtime.getURL(
              './images/contentImages/permission-arrow.png',
            )}
          />
        </div>
      ) : (
        <div className="gif-container">
          <div className="blocked-text">
            <p>
              This page access is blocked. To give access click on
              <span className="span-block">
                <img
                  className="camera-block"
                  src={browser.runtime.getURL(
                    './images/contentImages/camera-block.svg',
                  )}
                />
              </span>
              icon. See the instructions below!
            </p>
          </div>
          <img
            src={browser.runtime.getURL(
              './images/contentImages/grant-access.gif',
            )}
          />
        </div>
      )}
    </div>
  );
};

export default PermissionScreen;
