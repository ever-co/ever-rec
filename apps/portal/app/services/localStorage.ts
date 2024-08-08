export const getStorageItems = async (
  keys: string | string[],
): Promise<{ [key: string]: any }> => {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.local.get(keys, (res) => resolve(res));
  });
};

export const setStorageItems = async (items: {
  [key: string]: any;
}): Promise<void> => {
  // @ts-ignore
  await chrome.storage.local.set(items);
};

export const removeStorageItems = async (
  keys: string | string[],
): Promise<void> => {
  // @ts-ignore
  await chrome.storage.local.remove(keys);
};

export const clearStorage = async (): Promise<void> => {
  // @ts-ignore
  await chrome.storage.local.clear();
};
