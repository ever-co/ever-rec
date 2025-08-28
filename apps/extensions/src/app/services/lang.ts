import browser from '@/app/utilities/browser';

export const setLang = (lang: string) => {
  browser.storage.local.set({ lang: lang });
};

export const getLang = async () => {
  return await browser.storage.local.get('lang');
};
