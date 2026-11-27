import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * The theme actually on screen ('light' | 'dark'), or `undefined` until the page has mounted.
 *
 * next-themes only knows the stored choice on the server, so anything that draws differently per
 * theme (an icon, a logo, a third-party widget's `theme` prop) waits for the mount to avoid a
 * hydration mismatch.
 */
const useResolvedTheme = (): 'light' | 'dark' | undefined => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return undefined;

  return resolvedTheme === 'dark' ? 'dark' : 'light';
};

export default useResolvedTheme;
