import { useMemo, useState } from 'react';
import { Search, Settings, Tv, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { logoUrl, type NowNext } from '@/lib/api';
import { channelKey, type NumberedChannel } from '@/lib/channels';
import { cn } from '@/lib/utils';

interface ChannelSidebarProps {
  channels: NumberedChannel[];
  groups: string[];
  activeGroup: string;
  currentId: string | null;
  nowNext: Record<string, NowNext>;
  onSelectGroup: (group: string) => void;
  onTune: (channel: NumberedChannel) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

const ALL = 'Todos';

export function ChannelSidebar({
  channels,
  groups,
  activeGroup,
  currentId,
  nowNext,
  onSelectGroup,
  onTune,
  onOpenSettings,
  onClose,
}: ChannelSidebarProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      const inGroup = activeGroup === ALL || c.groups.includes(activeGroup);
      if (!inGroup) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || String(c.number).includes(q);
    });
  }, [channels, activeGroup, query]);

  const items = [ALL, ...groups];

  return (
    <div className="absolute inset-0 z-40">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />

      <div className="absolute inset-y-0 left-0 flex w-[580px] max-w-[92vw] animate-slide-in-left flex-col border-r border-border bg-card shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" data-focusable="true" onClick={onClose} aria-label="Fechar">
              <X />
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-none">Canais</h1>
              <p className="text-xs text-muted-foreground">{filtered.length} de {channels.length}</p>
            </div>
          </div>
          <Button variant="secondary" data-focusable="true" onClick={onOpenSettings}>
            <Settings /> Config
          </Button>
        </header>

        <div className="shrink-0 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-focusable="true"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou número"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-36 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-background/40 p-2">
            {items.map((group) => (
              <button
                key={group}
                type="button"
                data-focusable="true"
                onClick={() => onSelectGroup(group)}
                className={cn(
                  'truncate rounded-md px-3 py-2 text-left text-sm transition-colors',
                  group === activeGroup ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {group}
              </button>
            ))}
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhum canal encontrado.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filtered.map((channel) => {
                  const nn = nowNext[channelKey(channel)];
                  const isCurrent = channel.id === currentId;
                  return (
                    <button
                      key={channel.id + channel.url}
                      type="button"
                      data-focusable="true"
                      onClick={() => onTune(channel)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        isCurrent ? 'bg-primary/20' : 'hover:bg-accent',
                      )}
                    >
                      <span className="w-11 shrink-0 text-right text-lg font-bold tabular-nums text-muted-foreground">
                        {channel.number}
                      </span>
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-black/40">
                        {channel.logo ? (
                          <img
                            src={logoUrl(channel.logo)}
                            alt=""
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Tv className="size-4 text-white/40" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{channel.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {nn?.current?.title ?? channel.groups.join(' • ')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
