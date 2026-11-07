import { useEffect, useState } from 'react';
import { getHealth, getStatus } from 'app/services/ever-platform';
import { getCookies } from 'app/services/helpers/getCookies';

/**
 * Whether this signed-in person may open *Settings → Ever Platform*: the API has the anonymous
 * usage statistics loaded (`health` answers 200) and the person operates the installation
 * (`status` answers 200). Asked once per page load, and only for a signed-in person.
 */
let cached: Promise<boolean> | null = null;

/** Forgets the cached answer (tests, sign-out). */
export const resetEverPlatformAvailable = () => {
  cached = null;
};

export const loadEverPlatformAvailable = (): Promise<boolean> => {
  if (!getCookies().idToken) {
    return Promise.resolve(false);
  }
  if (!cached) {
    cached = getHealth()
      .then(() => getStatus())
      .then(() => true)
      .catch(() => false);
  }
  return cached;
};

const useEverPlatformAvailable = (): boolean => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void loadEverPlatformAvailable().then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return available;
};

export default useEverPlatformAvailable;
