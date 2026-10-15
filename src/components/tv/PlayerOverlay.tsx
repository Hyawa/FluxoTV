import type { MouseEvent } from 'react';
import { Menu, Settings, SkipBack, SkipForward, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoUrl, type NowNext } from '@/lib/api';
import type { NumberedChannel } from '@/lib/channels';
import { formatRange } from '@/lib/format';

interface PlayerOverlayProps {
  channel: NumberedChannel;
  nowNext?: NowNext;
  onMenu: () => void;
  onSettings: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function PlayerOverlay({
  channel,
  nowNext,
  onMenu,
  onSettings,
  onPrev,
  onNext,
}: PlayerOverlayProps) {
  const current = nowNext?.current ?? null;
  const next = nowNext?.next ?? null;

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex animate-fade-in flex-col justify-between">
      <div className="flex items-start justify-between gap-4 bg-gradient-to-b from-black/90 to-transparent p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto size-12 rounded-full"
            onClick={stop(onMenu)}
            aria-label="Canais"
          >
            <Menu className="size-6" />
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-5xl font-black leading-none tabular-nums text-white drop-shadow">
              {channel.number}
            </span>
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 p-2">
              {channel.logo ? (
                <img
                  src={logoUrl(channel.logo)}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Tv className="size-7 text-white/60" />
              )}
            </div>
            <div className="text-white">
              <p className="max-w-[40vw] truncate text-2xl font-semibold leading-tight">{channel.name}</p>
              <p className="truncate text-sm text-white/50">{channel.groups.join(' • ')}</p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="icon"
          className="pointer-events-auto size-12 rounded-full"
          onClick={stop(onSettings)}
          aria-label="Configurações"
        >
          <Settings className="size-6" />
        </Button>
      </div>

      <div className="flex items-end justify-between gap-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 pt-16">
        <div className="min-w-0 max-w-[55%] text-white">
          {current ? (
            <p className="truncate text-lg">
              <span className="text-white/50">Agora: </span>
              <span className="font-medium">{current.title}</span>
              <span className="ml-2 text-sm text-white/40">{formatRange(current.start, current.stop)}</span>
            </p>
          ) : (
            <p className="text-sm text-white/40">Programação indisponível</p>
          )}
          {next && (
            <p className="truncate text-sm text-white/70">
              <span className="text-white/40">A seguir: </span>
              {next.title}
              <span className="ml-2 text-white/30">{formatRange(next.start, next.stop)}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="pointer-events-auto h-14 gap-2 rounded-full px-6 text-base"
            onClick={stop(onPrev)}
          >
            <SkipBack className="size-6" /> Anterior
          </Button>
          <Button
            size="lg"
            className="pointer-events-auto h-14 gap-2 rounded-full px-6 text-base"
            onClick={stop(onNext)}
          >
            Próximo <SkipForward className="size-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
