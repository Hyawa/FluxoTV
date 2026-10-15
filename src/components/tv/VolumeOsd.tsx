import { Volume1, Volume2, VolumeX } from 'lucide-react';

export function VolumeOsd({ volume }: { volume: number }) {
  const pct = Math.round(volume * 100);
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex animate-fade-in items-center justify-center">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-black/75 px-8 py-7 shadow-2xl backdrop-blur-md">
        <Icon className="size-7 text-white/80" />
        <div className="relative h-56 w-14 overflow-hidden rounded-full bg-white/15">
          <div
            className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-primary to-primary/50 transition-[height] duration-150 ease-out"
            style={{ height: `${pct}%` }}
          />
        </div>
        <span className="text-3xl font-bold tabular-nums text-white">{pct}%</span>
      </div>
    </div>
  );
}
