import React, { FC, useRef, useEffect, useState } from 'react';
import { SourceInfo, Source } from 'plyr';
import Plyr, { APITypes } from 'plyr-react';
import Hls from 'hls.js';
import plyrOptions from './plyr-options';
import {
  sendCurrentTimeEvent,
  sendThumbnailURLEvent,
  VideoCustomEventsEnum,
} from 'misc/customEvents';
import 'plyr-react/dist/plyr.css';
import {
  CHAPTER_THUMBNAIL_HEIGHT,
  CHAPTER_THUMBNAIL_WIDTH,
} from 'misc/appConstConfig';
import { createVideoThumbnailURL } from 'misc/videoChapterHelperFunctions';
import { windowEventListenerHandler } from 'misc/windowEventListenerHandler';
import { IChapter } from 'app/interfaces/IChapter';
const mux = require('mux-embed');

type PlyrTypes = APITypes & { plyr: { media: HTMLVideoElement } };

interface IPlyrProps {
  videoURL?: string;
  disableOptions?: boolean;
}

enum HttpStreamType {
  HLS = '.m3u8',
  DASH = '.mpd',
}

const checkHLSorDASH = (url: string): HttpStreamType | boolean => {
  if (url.toLowerCase().endsWith(HttpStreamType.DASH)) {
    return HttpStreamType.DASH;
  } else if (url.toLowerCase().endsWith(HttpStreamType.HLS)) {
    return HttpStreamType.HLS;
  }

  return false;
};

const defaultSources: SourceInfo = {
  sources: [{ src: '' }],
  type: 'video',
};

export const PlyrPlayer: FC<IPlyrProps> = ({ videoURL, disableOptions }) => {
  const videoRef = useRef<null | PlyrTypes>(null);
  const currentTime = useRef<number>(0);
  const pausedRef = useRef<boolean>(true);
  const chaptersRef = useRef<IChapter[]>([]);
  const [videoSources, setVideoSources] = useState(defaultSources);
  const [streamSource, setStreamSource] = useState<string | null>(null);
  const [savedTime, saveCurrentTime] = useState(0);
  const [playerInitTime] = useState(Date.now());
  const [playerOptions, setPlayerOptions] = useState(plyrOptions);

  useEffect(() => {
    if (!videoURL || videoURL === null) return;

    saveCurrentTime(currentTime.current);

    // for streaming types we will inject Plyr with HLS or DASH player and not default VideoSources
    if (checkHLSorDASH(videoURL)) {
      setStreamSource(videoURL);
      setVideoSources({} as SourceInfo);
      return;
    }

    updateVideoSources([videoURL]);
  }, [videoURL, playerOptions]);

  const updateVideoSources = (url: string[]) => {
    // we might not need more than one source per video,
    // not sure if loading multiple HLS/DASH sources is possible
    if (checkHLSorDASH(url[0])) {
      setStreamSource(url[0]);
      setVideoSources({} as SourceInfo);
      return;
    }

    const sources: Source[] = [];

    url.forEach((url) => {
      sources.push({ src: url });
    });

    const updatedVideoSources: SourceInfo = {
      type: 'video',
      title: 'test',
      sources,
    };

    setVideoSources(updatedVideoSources);
  };

  // HLS support
  useEffect(() => {
    if (streamSource === null) return;
    if (!streamSource.toLowerCase().endsWith(HttpStreamType.HLS)) return;

    const hls = new Hls();
    const loadVideo = async () => {
      const video = document.getElementById('plyr') as HTMLVideoElement;

      if (Hls.isSupported()) {
        hls.loadSource(streamSource);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            console.error('hls.js fatal error', event, data);
          }
        });
      } else {
        console.error(
          // eslint-disable-next-line max-len
          'This is an old browser that does not support MSE https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API',
        );
      }
    };

    loadVideo();

    // TODO
    // MUX Data Metrics
    // const MUX_DATA = SdkConfig.get().mux_data['env_key'];
    const MUX_DATA = null;
    if (typeof mux !== 'undefined' && MUX_DATA) {
      mux.monitor('#plyr', {
        hlsjs: hls,
        Hls,
        data: {
          env_key: MUX_DATA,

          player_name: 'hls.js player',
          video_id: videoURL,
          video_title: videoURL,
          video_stream_type: 'on-demand',
          player_init_time: playerInitTime,
        },
      });
    }

    return () => {
      hls.destroy();
    };
  }, [videoSources, streamSource]);

  // Chapter related events
  useEffect(() => {
    const createMarkers = (event: any) => {
      const shouldApply = event.detail.shouldApply;
      const eventChapters: IChapter[] = event.detail.chapters;
      let chapters: IChapter[] = [...eventChapters];

      // Bring back saved chapters if an empty array was sent from event clicked by chapter visibility button
      if (!eventChapters.length) {
        if (chaptersRef.current.length) {
          chapters = [...chaptersRef.current];
        }
      }

      chaptersRef.current = [...chapters];

      if (!shouldApply) return;

      const markerPoints = chapters.map((chapter) => {
        const newPoint = {
          time: chapter.timestampSeconds,
          label: `<strong>${chapter.content}</strong>`,
        };

        return newPoint;
      });
      const markers = { enabled: true, points: markerPoints };

      setPlayerOptions({ ...playerOptions, markers });
    };

    const removeMarkers = () => {
      const markers = { enabled: false, points: [] };
      setPlayerOptions({ ...playerOptions, markers });
    };

    const chapterActivated = (event: any) => {
      if (!videoRef.current) return;

      const seconds: number = event.detail.timestampSeconds;

      videoRef.current.plyr.media.currentTime = seconds;
    };

    const forceTimeUpdate = () => {
      if (!videoRef.current) return;

      const isPaused = videoRef.current.plyr.paused;
      if (isPaused) {
        videoRef.current.plyr.play();
        videoRef.current.plyr.pause();
      } else {
        videoRef.current.plyr.pause();
        videoRef.current.plyr.play();
      }
    };

    const createThumbnail = async (event: any) => {
      const sourceURL = videoRef.current.plyr.source as unknown as string;
      const isHLS = sourceURL.includes('blob');
      const url = isHLS ? sourceURL : videoURL;

      const chapterId = event.detail.chapterId;
      const timestampSeconds = event.detail.timestampSeconds;

      const thumbnailURL = await createVideoThumbnailURL(
        url,
        CHAPTER_THUMBNAIL_WIDTH,
        CHAPTER_THUMBNAIL_HEIGHT,
        timestampSeconds,
        isHLS,
      );

      sendThumbnailURLEvent(chapterId, thumbnailURL);
    };

    const events = [
      VideoCustomEventsEnum.createMarkersEvent,
      VideoCustomEventsEnum.removeMarkersEvent,
      VideoCustomEventsEnum.chapterActivated,
      VideoCustomEventsEnum.forceTimeUpdate,
      VideoCustomEventsEnum.createThumbnail,
    ];

    const eventFunctions = [
      createMarkers,
      removeMarkers,
      chapterActivated,
      forceTimeUpdate,
      createThumbnail,
    ];

    windowEventListenerHandler(events, eventFunctions);
    return () => windowEventListenerHandler(events, eventFunctions, true);
  }, [playerOptions, videoURL]);

  const onVideoReference = (ref: any) => {
    if (!ref || ref.plyr.source === null) return;

    videoRef.current = { plyr: ref.plyr };

    if (savedTime) {
      videoRef.current.plyr.media.currentTime = savedTime;
      !pausedRef.current && videoRef.current.plyr.play();
    }

    const video = videoRef.current.plyr.media;
    video.addEventListener('timeupdate', (event: any) => {
      const duration = videoRef.current.plyr.duration;
      const currTime = event.target.currentTime;
      currentTime.current = currTime;

      duration && sendCurrentTimeEvent(currTime, duration);
    });

    video.addEventListener('playing', (event: any) => {
      pausedRef.current = false;
    });

    video.addEventListener('pause', (event: any) => {
      pausedRef.current = true;
    });
  };

  return (
    <Plyr
      id="plyr"
      options={!disableOptions ? playerOptions : null}
      source={videoSources}
      ref={onVideoReference}
    />
  );
};

export default PlyrPlayer;
