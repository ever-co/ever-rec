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
import { ToastContainer } from 'react-toastify';
import '../styles/styles.scss';
import '../styles/antd.scss';
import '../styles/items.scss';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Index from './_index';

export type NextApplicationPage<P = any, IP = P> = NextPage<P, IP> & {
  requireAuth?: boolean;
};

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <GoogleOAuthProvider
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}
      >
        <Index />
        <Head>
          <title>Rec</title>
          <link rel="shortcut icon" href="/icons/16.png" />
        </Head>
        <ToastContainer />
        <main className="app">
          <Component {...pageProps} />
        </main>
      </GoogleOAuthProvider>
    </Provider>
  );
}

export default CustomApp;
