interface TypedNumberProps {
  digits: string;
  found: boolean | null;
}

export function TypedNumber({ digits, found }: TypedNumberProps) {
  return (
    <div className="absolute left-10 top-10 z-30 flex flex-col items-start gap-2">
      <div className="rounded-xl bg-black/80 px-8 py-4 backdrop-blur">
        <span className="text-6xl font-black tracking-tight text-white tabular-nums">{digits}</span>
      </div>
      {found === false && (
        <span className="rounded-md bg-red-600/90 px-3 py-1 text-sm font-medium text-white">
          Canal inexistente
        </span>
      )}
    </div>
  );
}
