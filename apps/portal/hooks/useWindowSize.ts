import { useEffect, useState } from 'react';

// This was document.body.clientWidth and Height, but because of SSR, starting with 0
export default function useWindowSize() {
  const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

  useEffect(() => {
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
