import browser from '@/app/utilities/browser';

export const setBadgeText = async (text: string) => {
  return browser.action.setBadgeText({
    text,
  });
};
