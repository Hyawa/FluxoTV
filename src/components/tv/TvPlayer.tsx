import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { streamUrl, type Channel } from '@/lib/api';

export type PlayStatus = 'loading' | 'playing' | 'error';

interface TvPlayerProps {
  channel: Channel;
  volume: number;
  onStatus: (status: PlayStatus, message?: string) => void;
}

export function TvPlayer({ channel, volume, onStatus }: TvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onStatusRef.current('loading');
    const src = streamUrl(channel.url);
    let hls: Hls | null = null;

    const onPlaying = () => onStatusRef.current('playing');
    const onWaiting = () => onStatusRef.current('loading');
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, backBufferLength: 30, maxBufferLength: 20 });
      hls.attachMedia(video);
      hls.loadSource(src);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
          return;
        }
        onStatusRef.current('error', 'Canal fora do ar ou sem sinal.');
      });
      void video.play().catch(() => undefined);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      void video.play().catch(() => undefined);
    } else {
      onStatusRef.current('error', 'HLS nao suportado neste dispositivo.');
    }

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [channel]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.volume = volume;
  }, [volume]);

  return <video ref={videoRef} className="h-full w-full bg-black object-contain" playsInline autoPlay />;
}
