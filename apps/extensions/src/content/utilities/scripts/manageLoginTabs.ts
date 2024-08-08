import browser from '@/app/utilities/browser';
import {
  getStorageItems,
  removeStorageItems,
  setStorageItems,
} from '@/app/services/localStorage';
import { panelRoutes } from '@/content/panel/router/panelRoutes';

export const createLoginTab = async (
  justInstalled: boolean,
  signedOut: boolean,
  saveImage: boolean,
  tab?: chrome.tabs.Tab,
  normalLogout = false,
) => {
  let url = `${process.env.WEBSITE_URL}/auth/login`;

  if (justInstalled || signedOut) {
    const queries = [
      `${justInstalled ? 'justInstalled=true' : ''}`,
      `${signedOut ? 'signedOut=true' : ''}`,
    ];
    url += '?' + queries.filter(Boolean).join('&');
  }

  url += `${!justInstalled && !signedOut ? '?' : '&'}` + 'ext=true';

  if (saveImage) {
    url += `&saveImage=true`;
  }

  const tabUrl = tab?.url;
  if (tabUrl && !normalLogout) {
    if (tabUrl.includes(panelRoutes.videos.path)) {
      url += `&videos=true`;
    } else if (tabUrl.includes(panelRoutes.integrations.path)) {
      url += `&integrations=true`;
    } else if (tabUrl.includes(panelRoutes.imagesShared.path)) {
      url += `&shared=true`;
    } else if (tabUrl.includes(panelRoutes.profile.path)) {
      url += `&profile=true`;
    }
  }

  try {
    const loginTab = tab?.id
      ? await browser.tabs.update(tab.id, { url })
      : await browser.tabs.create({ url });

    await removeStorageItems('loginTabId');
    await setStorageItems({ loginTabId: loginTab.id });
  } catch (error) {
    console.error(error);
  }
};

export const updateLoginTab = async (justInstalled?: boolean) => {
  let url = browser.runtime.getURL(panelRoutes.images.path);
  if (justInstalled) url = browser.runtime.getURL(panelRoutes.install.path);

  try {
    const { loginTabId } = await getStorageItems('loginTabId');

    await chrome.tabs.update(loginTabId, { url });
    await removeStorageItems('loginTabId');
  } catch (error) {
    console.error(error);
    chrome.tabs.update({
      url,
    });
  }
};
