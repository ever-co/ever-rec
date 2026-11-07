import { useEffect, useState } from 'react';
import { getEverIdConfigAPI, IEverIdConfig } from 'app/services/api/everId';

/** Read once per page load; the server decides at runtime, no rebuild needed. */
let cached: Promise<IEverIdConfig> | null = null;

/** Forgets the cached answer (tests). */
export const resetEverIdConfigCache = () => {
  cached = null;
};

export const loadEverIdConfig = (): Promise<IEverIdConfig> => {
  if (!cached) {
    cached = getEverIdConfigAPI()
      .then((config) => ({ ...config, enabled: config?.enabled === true }))
      .catch(() => {
        // An older server without the route, or no connection: no button.
        cached = null;
        return { enabled: false };
      });
  }
  return cached;
};

/**
 * Whether the server offers Ever ID sign-in. `enabled` stays `false` until the server says
 * otherwise, so the button never flashes on servers that do not offer it.
 */
const useEverIdConfig = (): { enabled: boolean; loading: boolean } => {
  const [state, setState] = useState({ enabled: false, loading: true });

  useEffect(() => {
    let active = true;
    loadEverIdConfig().then((config) => {
      if (active) setState({ enabled: config.enabled, loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
};

export default useEverIdConfig;
