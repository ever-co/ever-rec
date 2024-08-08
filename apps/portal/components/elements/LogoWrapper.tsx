import React, { CSSProperties, FC, useEffect, useState } from 'react';
import Logo from './Logo';
import classNames from 'classnames';

const getWindowDimensions = () => {
  try {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height,
    };
  } catch (e) {
    return { width: 0, height: 0 };
  }
};

export const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (global.window) {
      setWindowDimensions(getWindowDimensions());
    }
  }, [global]);

  return windowDimensions;
};

const LogoWrapper: FC = () => {
  const { height } = useWindowDimensions();

  let style: CSSProperties = {};
  if (height <= 840) style = { marginTop: '0px' };

  return (
    <div className={classNames('tw-mt-10 tw-mb-10')} style={style}>
      <Logo />
    </div>
  );
};

export default LogoWrapper;
