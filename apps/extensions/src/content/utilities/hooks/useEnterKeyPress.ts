import { useEffect } from 'react';

const useEnterKeyPress = (callback: () => void) => {
  useEffect(() => {
    const keyPress = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        callback();
      }
    };

    window.addEventListener('keydown', keyPress);
    return () => window.removeEventListener('keydown', keyPress);
  });
};

export default useEnterKeyPress;
