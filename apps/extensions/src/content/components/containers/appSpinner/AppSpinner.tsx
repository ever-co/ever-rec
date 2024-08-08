import classNames from 'classnames';
import React from 'react';
import './app-spinner-styles.css';

export interface IAppSpinnerProps {
  show: boolean;
  tip?: string;
  local?: boolean;
  removeWhiteBackground?: boolean;
}

const AppSpinner: React.FC<IAppSpinnerProps> = ({
  show,
  local,
  removeWhiteBackground,
}) => {
  return show ? (
    <div
      className={classNames(
        ` tw-w-full tw-h-full tw-top-0 tw-left-0 tw-right-0 tw-bottom-0 tw-flex tw-items-center tw-justify-center ${
          removeWhiteBackground
            ? 'tw-bg-transparent'
            : 'tw-bg-white tw-bg-opacity-90 tw-z-20'
        }`,
        local ? 'tw-absolute' : 'tw-fixed',
      )}
    >
      <div className="lds-ring">
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="tw-absolute tw-w-full tw-h-full tw-flex tw-items-center tw-justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.29713 0.380388C7.62472 0.379221 5.98955 0.868057 4.5985 1.78504C3.20746 2.70203 2.12305 4.00596 1.4825 5.53184C0.841957 7.05772 0.67405 8.73698 1.00003 10.3571C1.32601 11.9773 2.13123 13.4656 3.3138 14.6336C4.49637 15.8016 6.00314 16.5969 7.64347 16.9189C9.2838 17.2409 10.984 17.075 12.5288 16.4424C14.0737 15.8097 15.3939 14.7386 16.3223 13.3647C17.2507 11.9907 17.7456 10.3757 17.7444 8.72381C17.7444 6.511 16.8544 4.38882 15.2703 2.82412C13.6861 1.25943 11.5375 0.380388 9.29713 0.380388ZM11.3238 8.19239C10.7893 8.19239 10.2669 8.03585 9.82251 7.74259C9.37814 7.44932 9.0318 7.03249 8.82728 6.5448C8.62276 6.05711 8.56924 5.52047 8.67351 5.00275C8.77777 4.48502 9.03513 4.00946 9.41304 3.6362C9.79094 3.26294 10.2724 3.00875 10.7966 2.90577C11.3208 2.80278 11.8641 2.85564 12.3578 3.05764C12.8516 3.25965 13.2736 3.60174 13.5705 4.04064C13.8675 4.47955 14.0259 4.99557 14.0259 5.52344C14.0267 5.87415 13.9574 6.22155 13.8218 6.54572C13.6863 6.86988 13.4873 7.16442 13.2362 7.41241C12.9852 7.6604 12.687 7.85696 12.3588 7.99081C12.0306 8.12466 11.6788 8.19316 11.3238 8.19239Z"
              fill="#5b4dbe"
            />
          </svg>
        </div>
      </div>
    </div>
  ) : null;
};

export default AppSpinner;
