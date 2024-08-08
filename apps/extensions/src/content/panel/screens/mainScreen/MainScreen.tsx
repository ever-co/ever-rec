import React from 'react';
import AppStyleTitle from '@/content/components/elements/AppStyleTitle';


const MainScreen: React.FC = () => {

  return (
    <div>
    <div className="tw-w-full tw-mb-4 tw-flex tw-items-center tw-justify-center">
      <div className="tw-text-3xl tw-mr-4 tw-items-center"><AppStyleTitle title1="Rec" title2="Panel" spacing /></div>
      <div></div>
    </div>
    </div>
  );
}

export default MainScreen;
