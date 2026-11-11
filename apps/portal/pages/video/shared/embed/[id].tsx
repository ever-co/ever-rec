import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import 'plyr/dist/plyr.css';
import { getVideoForPublicPage } from 'app/services/videos';
import { PlaybackStatusEnum } from 'app/enums/StreamingServicesEnums';
import useRenderVideo from 'hooks/useRenderVideo';
import useStreamState from 'hooks/useStreamState';
import { fallbackVideoURL } from 'misc/fallbackVideoURL';
import { useTranslation } from 'react-i18next';

// Player-only page of a publicly shared video. It is meant to be used inside an <iframe>,
// so it renders nothing but the player (no menu, comments or chapters).
const EmbeddedSharedVideo: FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
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
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      {notFound ? (
        <div
          style={{
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          {t('page.video.noAccess')}
        </div>
      ) : (
        renderVideo
      )}
    </div>
  );
};

export default EmbeddedSharedVideo;
