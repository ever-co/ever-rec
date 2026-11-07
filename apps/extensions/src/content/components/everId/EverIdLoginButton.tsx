import React, { useEffect, useState } from 'react';
import api from '@/app/services/api/api';
import browser from '@/app/utilities/browser';

/**
 * "Continue with Ever ID" for the extension's sign-in screens. Shown only when the server offers
 * Ever ID sign-in. The sign-in itself runs in the web app: this opens its login page, which starts
 * the Ever ID sign-in and hands the session to the extension the same way as any other sign-in. No
 * OpenID Connect code runs in the extension.
 */
const EverIdLoginButton: React.FC<{ className?: string }> = ({ className }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/api/v1/auth/ever-id/config')
      .then((config: any) => active && setEnabled(config?.enabled === true))
      .catch(() => active && setEnabled(false));
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  const open = () => {
    const url = `${process.env.WEBSITE_URL}/auth/login?ext=true&ever_id=1`;
    try {
      browser.tabs.create({ url });
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && open()}
      className={`tw-flex tw-py-2 tw-w-full tw-border tw-items-center tw-justify-center tw-border-app-grey tw-rounded-md tw-cursor-pointer hover:tw-bg-app-grey hover:tw-bg-opacity-10 ${
        className ?? ''
      }`}
    >
      <div className="tw-font-semibold tw-text-sm tw-text-dark-blue2">Continue with Ever ID</div>
    </div>
  );
};

export default EverIdLoginButton;
