import { FC } from 'react';
import { IUser } from 'app/interfaces/IUserData';
import 'plyr/dist/plyr.css';
import { ISharedItem } from 'app/interfaces/ISharedItem';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getUserServerSideProps } from 'app/services/api/auth';
import 'react-tabs/style/react-tabs.css';
import SingleVideoPage from '../[id]';

// TODO: This page should be optimized to fetch the video data server side and pass it down to the SingleVideoPage component.

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { refreshToken, idToken } = context.req.cookies;
  const ip =
    context.req.headers['x-real-ip'] || context.req.socket.remoteAddress;

  if (refreshToken && idToken) {
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const user: IUser | null = await getUserServerSideProps(
      refreshToken,
      idToken,
      baseURL || '',
    );
    if (user) {
      return { props: { user, ip } };
    } else {
      return { props: { user: null, ip } };
    }
  } else {
    return { props: { user: null, ip } };
  }
};

const SharedVideo: FC<ISharedItem> = ({ user, ip }) => {
  return <SingleVideoPage isPublic ip={ip} />;
};

export default SharedVideo;
