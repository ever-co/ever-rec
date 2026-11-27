import { useEffect, useState } from 'react';

// Phone width: below Tailwind's `md` breakpoint (768px), the width the shell's drawer uses too.
export const PHONE_MEDIA_QUERY = '(max-width: 767px)';

export const isPhoneViewport = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(PHONE_MEDIA_QUERY).matches;

// True while the window is narrower than 768px. It reads the width on the first render, so a part
// that renders only in the browser (the editor's panel mounts once the image has loaded) never
// draws its desktop layout on a phone first. The server always gets false: do not let
// server-rendered markup depend on it, or hydration will not match.
export default function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(isPhoneViewport);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(PHONE_MEDIA_QUERY);
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return isPhone;
}
