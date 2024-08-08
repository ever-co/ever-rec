/* eslint-disable @next/next/no-img-element */
import { FC, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { IoMdClose } from 'react-icons/io';

interface IProps {
  imageUrl: string;
  visible: boolean;
  closeModal: () => void;
}

const percentStrings = ['25', '50', '100', '125', '150', '200'];

const ImageModal: FC<IProps> = ({ imageUrl, visible, closeModal }) => {
  const [zoomPercentIndex, setZoomPercent] = useState(2); //  percentStrings[2] = 100
  const [isZoomed, setIsZoomed] = useState(false);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setIsZoomed(false);
    setZoomPercent(2);
  }, [closeModal]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleCloseModal]);

  const handleZoomOut = () => {
    setZoomPercent((prevZoomPercent) => {
      if (prevZoomPercent === 0) {
        return prevZoomPercent;
      }

      if (prevZoomPercent - 1 <= 2) {
        setIsZoomed(false);
      }

      return prevZoomPercent - 1;
    });
  };

  const handleZoomIn = () => {
    setZoomPercent((prevZoomPercent) => {
      if (prevZoomPercent === 5) {
        return prevZoomPercent;
      }

      if (prevZoomPercent + 1 > 2) {
        setIsZoomed(true);
      }

      return prevZoomPercent + 1;
    });
  };

  let zoomClasses = 'tw-w-125p tw-max-w-125p';
  if (zoomPercentIndex === 4) {
    zoomClasses = 'tw-w-150p tw-max-w-150p';
  } else if (zoomPercentIndex === 5) {
    zoomClasses = 'tw-w-200p tw-max-w-200p';
  }

  if (!visible) return null;

  return (
    <div
      className={classNames(
        'tw-bg-app-grey-darker tw-bg-opacity-90 tw-top-0 tw-left-0 tw-min-h-screen tw-overflow-y-auto tw-pr-20px tw-box-content tw-select-none',
        isZoomed
          ? zoomClasses + ' tw-p-0 tw-absolute'
          : 'tw-fixed tw-bottom-0 tw-w-screen tw-max-w-full',
      )}
    >
      <div
        className={classNames(
          'tw-fixed tw-flex tw-justify-between tw-items-center tw-top-25px tw-w-170px tw-z-40',
          isZoomed ? 'tw-right-20px' : 'tw-right-35px',
        )}
      >
        <div className="tw-border-solid tw-border-2 tw-border-dark-grey tw-flex tw-justify-between tw-px-4 tw-py-2 tw-bg-black tw-bg-opacity-90 tw-w-100px tw-rounded-md tw-text-white">
          <span
            onClick={handleZoomIn}
            className="tw-text-lg tw-cursor-pointer tw-flex tw-items-center"
          >
            +
          </span>

          <span className="tw-text-sm tw-flex tw-items-center">
            {percentStrings[zoomPercentIndex]}
          </span>

          <span
            onClick={handleZoomOut}
            className="tw-text-lg tw-cursor-pointer tw-flex tw-items-center tw-mb-px"
          >
            &#8211;
          </span>
        </div>

        <IoMdClose
          size={40}
          onClick={handleCloseModal}
          className="tw-text-dark-grey tw-cursor-pointer"
        />
      </div>

      <img
        src={imageUrl}
        style={{
          transition: 'visibility 0.5s, opacity 0.5s ease-in',
          visibility: !isZoomed ? 'visible' : 'hidden',
          opacity: !isZoomed ? '1' : '0',
          height: !isZoomed ? 'auto' : '0',
          width:
            zoomPercentIndex === 1
              ? '70%'
              : zoomPercentIndex === 0
              ? '50%'
              : '',
        }}
        className={classNames(
          'tw-max-w-none tw-w-full tw-rounded-md default:tw-p-2 tw-m-auto',
          !isZoomed ? 'lg:tw-p-12 md:tw-p-6 xl:tw-p-24' : '',
        )}
        alt=""
      />
      <img
        src={imageUrl}
        style={{
          transition: 'visibility 0.5s, opacity 0.5s ease-in',
          visibility: isZoomed ? 'visible' : 'hidden',
          opacity: isZoomed ? '1' : '0',
          height: isZoomed ? 'auto' : '0',
        }}
        className={classNames(
          'tw-max-w-none tw-w-full tw-rounded-md',
          isZoomed ? 'tw-pl-20px' : '',
        )}
        alt=""
      />
    </div>
  );
};

export default ImageModal;
