import browser from '@/app/utilities/browser';

export const getStorageItems = async (
  keys: string | string[],
): Promise<{ [key: string]: any }> => {
  return new Promise((resolve) => {
    browser.storage.local.get(keys, (res) => resolve(res));
  });
};

export const setStorageItems = async (items: {
  [key: string]: any;
}): Promise<void> => {
  await browser.storage.local.set(items);
};

export const removeStorageItems = async (
  keys: string | string[],
): Promise<void> => {
  await browser.storage.local.remove(keys);
};

export const clearStorage = async (): Promise<void> => {
  await browser.storage.local.clear();
};
