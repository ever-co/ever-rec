import type { AppProps } from 'next/app';
import Head from 'next/head';
import { NextPage } from 'next';
import store from 'app/store/panel';
import {
  Provider,
  RootStateOrAny,
  useDispatch,
  useSelector,
} from 'react-redux';
import '../styles/styles.scss';
import '../styles/antd.scss';
import '../styles/items.scss';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Index from './_index';
import ThemeProvider from 'components/theme/ThemeProvider';
import ThemedToastContainer from 'components/theme/ThemedToastContainer';
import { TooltipProvider } from 'components/ui/tooltip';
import { ShellProvider } from 'components/shell/ShellContext';
import TermsGate from 'components/shared/TermsGate';
import '../i18n/config';

export type NextApplicationPage<P = any, IP = P> = NextPage<P, IP> & {
  requireAuth?: boolean;
};

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}
        >
          <TooltipProvider delayDuration={200}>
            <Index />
            <TermsGate />
            <Head>
              <title>Rec</title>
              <link rel="shortcut icon" href="/icons/16.png" />
            </Head>
            <ThemedToastContainer />
            <ShellProvider>
              <main className="app">
                <Component {...pageProps} />
              </main>
            </ShellProvider>
          </TooltipProvider>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default CustomApp;
