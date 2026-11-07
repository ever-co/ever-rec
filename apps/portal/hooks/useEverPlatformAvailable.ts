import { useEffect, useState } from 'react';
import { getHealth, getStatus } from 'app/services/ever-platform';
import { getCookies } from 'app/services/helpers/getCookies';

/**
 * Whether this signed-in person may open *Settings → Ever Platform*: the API has the anonymous
 * usage statistics loaded (`health` answers 200) and the person operates the installation
 * (`status` answers 200). Asked once per sign-in session, and only for a signed-in person: the
 * answer is kept for that session only, so the next person who signs in on this page (without a
 * reload) is asked again.
 */
let cached: { session: string; answer: Promise<boolean> } | null = null;

/** The signed-in session (its refresh token, else its ID token), or `null` when nobody is signed in. */
const currentSession = (): string | null => {
  const { idToken, refreshToken } = getCookies();
  if (!idToken) {
    return null;
  }
  return refreshToken || idToken;
};

/** Forgets the cached answer (tests, sign-out). */
export const resetEverPlatformAvailable = () => {
  cached = null;
};

export const loadEverPlatformAvailable = (): Promise<boolean> => {
  const session = currentSession();
  if (!session) {
    cached = null;
    return Promise.resolve(false);
  }
  if (cached?.session !== session) {
    cached = {
      session,
      answer: getHealth()
        .then(() => getStatus())
        .then(() => true)
        .catch(() => false),
    };
  }
  return cached.answer;
};

const useEverPlatformAvailable = (): boolean => {
  const [available, setAvailable] = useState(false);
  const session = currentSession();

  useEffect(() => {
    let active = true;
    setAvailable(false);
    void loadEverPlatformAvailable().then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, [session]);

  return available;
};

export default useEverPlatformAvailable;
