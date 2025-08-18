import { useEffect } from 'react';
import { useRouter } from 'next/router';

function parseOAuthHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return Object.fromEntries(params.entries());
}

export default function AuthorizePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Parse the fragment (#...) after redirect
    const oauthData = parseOAuthHash(window.location.hash);

    if (oauthData.access_token || oauthData.id_token) {
      // Build custom deeplink
      const deeplinkUrl = `ever-rec://oauth?${new URLSearchParams(oauthData).toString()}`;

      // Redirect to Electron app
      window.location.href = deeplinkUrl;
    } else {
      // If no tokens found, maybe redirect back or show error
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">Processing login...</p>
    </div>
  );
}
