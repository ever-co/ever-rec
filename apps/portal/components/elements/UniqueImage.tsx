import React from 'react';
import classNames from 'classnames';
import styles from './elementsStyles/UniqueViews.module.scss';
import { UniqueView } from 'app/interfaces/IUniqueView';

interface IUniqueImageProps {
  view: UniqueView;
}

const UniqueImage: React.FC<IUniqueImageProps> = ({ view }) => {
  return (
    <span className="tw-border-white tw-border-2 tw-rounded-full tw-mr-13negative">
      <img
        src={view?.photoURL}
        className={classNames(
          styles.userPhoto,
          'tw-w-full tw-object-cover tw-rounded-full tw-h-6 tw-w-6',
        )}
        alt=""
      />
    </span>
  );
};

export default UniqueImage;
