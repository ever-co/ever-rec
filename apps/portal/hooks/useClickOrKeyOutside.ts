import { useEffect, RefObject } from 'react';

type EventHandler = (event: MouseEvent | TouchEvent | KeyboardEvent) => void;
type Key =
  | 'Escape'
  | 'Enter'
  | 'Space'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | string;

function useClickOrKeyOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: EventHandler,
  key?: Key,
): void {
  useEffect(() => {
    const clickListener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    const keyListener = (event: KeyboardEvent) => {
      if (key && event.key === key) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', clickListener);
    document.addEventListener('touchstart', clickListener);
    document.addEventListener('keydown', keyListener);

    return () => {
      document.removeEventListener('mousedown', clickListener);
      document.removeEventListener('touchstart', clickListener);
      document.removeEventListener('keydown', keyListener);
    };
  }, [ref, handler, key]);
}

export default useClickOrKeyOutside;
