import React, { CSSProperties, FC, useEffect, useState } from 'react';
import Logo from '@/content/components/elements/Logo';
import classNames from 'classnames';


const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
};

export const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions(),
  );

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
};

const LogoWrapper: FC = () => {
  const { height } = useWindowDimensions();

  let style: CSSProperties = {};
  if (height <= 840) style = { marginTop: '0px' };

  return (
    <div className={classNames('tw-mt-20 tw-mb-10')} style={style}>
      <Logo />
    </div>
  );
};

export default LogoWrapper;
