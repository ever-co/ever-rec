import { FC, useEffect, useRef, useState } from 'react';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { addUniqueView } from 'app/services/imageandvideo';
import 'plyr/dist/plyr.css';
import { getVideoForPublicPage } from 'app/services/videos';
import { PlaybackStatusEnum } from 'app/enums/StreamingServicesEnums';
import useRenderVideo from 'hooks/useRenderVideo';
import useStreamState from 'hooks/useStreamState';
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
  const user = useAuthenticateUser();
  const addedUniqueView = useRef(false);
  const [video, setVideo] = useState<any>(null);
  const [urlLink, setUrlLink] = useState('');
  const [notFound, setNotFound] = useState(false);
  const { renderVideo } = useRenderVideo({ urlLink });
  const { streamState, setStreamState } = useStreamState(video);

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
  useEffect(() => {
    if (!video?.dbData || addedUniqueView.current) return;

    addedUniqueView.current = true;
    addUniqueView(
      user,
      ip,
      video.dbData,
      'video',
      Boolean(router.query.ws),
    ).catch(() => undefined);
  }, [video, user, ip, router.query.ws]);

  useEffect(() => {
    if (!video) return;

    const streamData = video.dbData?.streamData;
    if (streamData) {
      setStreamState({
        service: streamData.serviceType,
        assetId: streamData.assetId,
        playbackStatus: streamData.playbackStatus,
        downloadStatus: streamData.downloadStatus,
        downloadUrl: streamData.downloadUrl,
      });
    } else if (video.url) {
      setUrlLink(video.url);
    }
  }, [video, setStreamState]);

  useEffect(() => {
    if (streamState?.playbackStatus !== PlaybackStatusEnum.READY) return;
    if (!video?.url) return;

    fallbackVideoURL(video.url, video.dbData?.streamData?.downloadUrl || '')
      .then(setUrlLink)
      .catch(() => setUrlLink(video.url));
  }, [video, streamState?.playbackStatus]);

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
