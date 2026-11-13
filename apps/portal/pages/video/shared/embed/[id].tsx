import { FC, useEffect, useRef, useState } from 'react';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { addUniqueView } from 'app/services/imageandvideo';
import 'plyr/dist/plyr.css';
import { getVideoForPublicPage } from 'app/services/videos';
import { PlaybackStatusEnum } from 'app/enums/StreamingServicesEnums';
import useRenderVideo from 'hooks/useRenderVideo';
import { fallbackVideoURL } from 'misc/fallbackVideoURL';
import { useTranslation } from 'react-i18next';

// Player-only page of a publicly shared video. It is meant to be used inside an <iframe>,
// so it renders nothing but the player (no menu, comments or chapters).
export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const forwarded =
    context.req.headers['x-real-ip'] || context.req.socket.remoteAddress;
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || '';

  return { props: { ip } };
};

const EmbeddedSharedVideo: FC<{ ip?: string }> = ({ ip = '' }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const addedUniqueView = useRef(false);
  const [video, setVideo] = useState<any>(null);
  const [urlLink, setUrlLink] = useState('');
  const [notFound, setNotFound] = useState(false);
  const { renderVideo } = useRenderVideo({ urlLink });

  useEffect(() => {
    if (!router.isReady) return;

    const { id, ws } = router.query;
    if (!id || typeof id !== 'string') return setNotFound(true);

    let cancelled = false;
    getVideoForPublicPage(id, Boolean(ws))
      .then((data) => {
        if (cancelled) return;
        if (!data?.video) return setNotFound(true);
        setVideo(data.video);
      })
      .catch(() => !cancelled && setNotFound(true));

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query]);

  // Embedded plays count as views, the same way the regular shared page counts them.
  // The viewer is always recorded as anonymous: inside another site the Rec sign-in
  // cookies cannot be read, and restoring sign-in here (useAuthenticateUser) would tell
  // the browser extension to sign out.
  useEffect(() => {
    if (!video?.dbData || addedUniqueView.current) return;

    addedUniqueView.current = true;
    addUniqueView(
      null,
      ip,
      video.dbData,
      'video',
      Boolean(router.query.ws),
    ).catch(() => undefined);
  }, [video, ip, router.query.ws]);

  // The stream data is read once. The status endpoints need a signed-in user, so an
  // embedded (usually anonymous) viewer must never poll them.
  const streamData = video?.dbData?.streamData;
  const isProcessing =
    Boolean(streamData) &&
    streamData.playbackStatus !== PlaybackStatusEnum.READY;

  useEffect(() => {
    if (!video?.url) return;

    if (!streamData) {
      setUrlLink(video.url);
      return;
    }
    if (streamData.playbackStatus !== PlaybackStatusEnum.READY) return;

    let cancelled = false;
    fallbackVideoURL(video.url, streamData.downloadUrl || '')
      .then((url) => !cancelled && setUrlLink(url))
      .catch(() => !cancelled && setUrlLink(video.url));

    return () => {
      cancelled = true;
    };
  }, [video, streamData]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {notFound ? (
        t('page.video.noAccess')
      ) : isProcessing ? (
        t('page.image.processing')
      ) : (
        // Largest 16:9 box that fits the frame in both directions, centered,
        // so narrow or tall embeds do not stretch or crop the player.
        <div style={{ width: 'min(100vw, calc(100vh * 16 / 9))' }}>
          {renderVideo}
        </div>
      )}
    </div>
  );
};

export default EmbeddedSharedVideo;
