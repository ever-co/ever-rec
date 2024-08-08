import { useEffect } from 'react';
import { AppThemesEnum } from '@/background/utilities/enums/AppThemesEnum';

export const setThemeStorage = (theme: AppThemesEnum) => {
  if (theme === AppThemesEnum.dark) {
    chrome.storage.sync.set({
      theme: AppThemesEnum.dark,
    });
  } else {
    chrome.storage.sync.set({
      theme: AppThemesEnum.light,
    });
  }
};

const setGlobalClass = (theme: string) => {
  document.documentElement.className = theme;
};

const useTheme = () => {
  useEffect(() => {
    const listenerFunction = (
      changes: chrome.storage.StorageChange,
      namespace: 'sync' | 'local' | 'managed',
    ) => {
      for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        // console.log(
        //   `Storage key "${key}" in namespace "${namespace}" changed.`,
        //   `Old value was "${oldValue}", new value is "${newValue}".`,
        // );
        if (key === 'theme' && newValue === AppThemesEnum.dark) {
          setGlobalClass(`tw-${AppThemesEnum.dark}`);
        } else if (key === 'theme' && newValue === AppThemesEnum.light) {
          setGlobalClass('');
        }
      }
    };

    chrome.storage.onChanged.addListener(listenerFunction);
    return () => {
      chrome.storage.onChanged.removeListener(listenerFunction);
    };
  }, []);

  useEffect(() => {
    chrome.storage.sync.get(['theme'], (result) => {
      // console.log('Value is set to ' + result.theme);

      if (result.theme === AppThemesEnum.dark) {
        setGlobalClass(`tw-${AppThemesEnum.dark}`);
      }
    });
  }, []);
};

export default useTheme;
