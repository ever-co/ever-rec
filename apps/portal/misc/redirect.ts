import { NextRouter } from 'next/router';
import { sendExternalMessage } from './_helper';
import { isBrowserCompatible } from './browserCompatible';
import { panelRoutes, preRoutes } from 'components/_routes';

const defineExtensionRoute = (
  videoParam?: string,
  integrationsParam?: string,
  sharedParam?: string,
  profileParam?: string,
) => {
  const videos = Boolean(videoParam);
  const integrations = Boolean(integrationsParam);
  const shared = Boolean(sharedParam);
  const profile = Boolean(profileParam);

  let url = `chrome-extension://${process.env.NEXT_PUBLIC_EXTENSION_ID}`;

  if (videos) {
    url += preRoutes.media + panelRoutes.videos;
  } else if (integrations) {
    url += preRoutes.media + panelRoutes.integrations;
  } else if (shared) {
    url += preRoutes.media + panelRoutes.shared;
  } else if (profile) {
    url += preRoutes.settings + panelRoutes.profile;
  } else {
    url += preRoutes.media + panelRoutes.images;
  }

  return url + '.html?justLoggedIn=true';
};

const redirect = (router: NextRouter) => {
  const {
    justInstalled,
    ext,
    saveImage,
    workspaceInvite,
    videos, // from extension popup
    integrations, // from extension popup
    shared, // from extension popup
    profile, // from extension popup
    shImage, // from shared image page
    shVideo, // from shared video page
  } = router.query;

  if (justInstalled) {
    window.location.assign(
      `chrome-extension://${process.env.NEXT_PUBLIC_EXTENSION_ID}/install.html`,
    );
    return;
  }

  // If there is no extension param go to web portal
  if (!ext || !isBrowserCompatible) {
    if (workspaceInvite) {
      router.push(`${panelRoutes.workspaceInvite}/${workspaceInvite}`);
      return;
    }

    if (shImage) {
      router.push(`${panelRoutes.sharedImage}/${shImage}`);
      return;
    } else if (shVideo) {
      router.push(`${panelRoutes.sharedVideo}/${shVideo}`);
      return;
    }

    router.push(preRoutes.media + panelRoutes.images, undefined, {
      shallow: true,
    });
    return;
  }

  if (!saveImage) {
    window.location.assign(
      defineExtensionRoute(
        videos as string,
        integrations as string,
        shared as string,
        profile as string,
      ),
    );
  } else if (saveImage) {
    sendExternalMessage('saveImage', null);
  } else {
    router.push(preRoutes.media + panelRoutes.images, undefined, {
      shallow: true,
    });
  }
};

export default redirect;
