import { useLayoutEffect, useState } from 'react';

export default function useWindowSize() {
  const [dimensions, setDimensions] = useState({
    height: document.body.clientHeight,
    width: document.body.clientWidth,
  });

  useLayoutEffect(() => {
    function updateSize() {
      setDimensions({
        height: document.body.clientHeight,
        width: document.body.clientWidth,
      });
    }

    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return dimensions;
}
