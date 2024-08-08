import { useRef } from 'react';

const useFirstRender = () => {
  const ref = useRef(true);
  const firstRender = ref.current;
  ref.current = false;
  return firstRender;
};

export default useFirstRender;
