import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TvPlayer, type PlayStatus } from '@/components/tv/TvPlayer';
import { PlayerOverlay } from '@/components/tv/PlayerOverlay';
import { VolumeOsd } from '@/components/tv/VolumeOsd';
import { TypedNumber } from '@/components/tv/TypedNumber';
import { ChannelSidebar } from '@/components/tv/ChannelSidebar';
import { SettingsScreen } from '@/components/tv/SettingsScreen';
import { usePlaylist } from '@/hooks/usePlaylist';
import { useNowNext } from '@/hooks/useNowNext';
import { focusFirst, useSpatialNav } from '@/hooks/useSpatialNav';
import { buildChannelIndex, channelKey } from '@/lib/channels';
import { loadState, saveState } from '@/lib/store';

type Mode = 'loading' | 'tv' | 'sidebar' | 'settings';

const ALL = 'Todos';
const INFO_MS = 6000;
const TYPE_MS = 1600;
const OSD_MS = 1500;

export function App() {
  const { channels, groups, loading, error, reload } = usePlaylist();
  const [persisted] = useState(loadState);

  const [overrides, setOverrides] = useState<Record<string, number>>(persisted.numbers);
  const [volume, setVolume] = useState(persisted.volume);
  const [mode, setMode] = useState<Mode>('loading');
  const [currentId, setCurrentId] = useState<string | null>(persisted.lastId);
  const [overlay, setOverlay] = useState(false);
  const [typed, setTyped] = useState('');
  const [found, setFound] = useState<boolean | null>(null);
  const [showVolume, setShowVolume] = useState(false);
  const [activeGroup, setActiveGroup] = useState(ALL);
  const [playStatus, setPlayStatus] = useState<PlayStatus>('loading');
  const [playError, setPlayError] = useState('');
  const [started, setStarted] = useState(false);

  const index = useMemo(() => buildChannelIndex(channels, overrides), [channels, overrides]);
  const current = currentId ? index.byId.get(currentId) : undefined;

  const infoTimer = useRef<number | null>(null);
  const typeTimer = useRef<number | null>(null);
  const osdTimer = useRef<number | null>(null);
  const typedRef = useRef('');
  typedRef.current = typed;

  useSpatialNav(mode === 'sidebar');

  const currentIds = current ? [channelKey(current)] : [];
  const currentNN = useNowNext(currentIds);
  const sidebarIds = useMemo(
    () => (mode === 'sidebar' ? index.list.map((c) => channelKey(c)) : []),
    [mode, index.list],
  );
  const sidebarNN = useNowNext(sidebarIds, mode === 'sidebar');

  const showInfo = useCallback(() => {
    setOverlay(true);
    if (infoTimer.current) window.clearTimeout(infoTimer.current);
    infoTimer.current = window.setTimeout(() => setOverlay(false), INFO_MS);
  }, []);

  const toggleOverlay = useCallback(() => {
    setOverlay((o) => {
      if (o) return false;
      if (infoTimer.current) window.clearTimeout(infoTimer.current);
      infoTimer.current = window.setTimeout(() => setOverlay(false), INFO_MS);
      return true;
    });
  }, []);

  // Boot: pick last channel or first available
  useEffect(() => {
    if (started || loading || channels.length === 0) return;
    const last = persisted.lastId;
    const fallback = last && index.byId.has(last) ? last : index.list[0]?.id ?? null;
    setCurrentId(fallback);
    setMode('tv');
    setStarted(true);
    showInfo();
  }, [started, loading, channels.length, index, index.list, persisted.lastId, showInfo]);

  useEffect(() => {
    saveState({ numbers: overrides, lastId: currentId, volume });
  }, [overrides, currentId, volume]);

  const tune = useCallback(
    (id: string) => {
      setCurrentId(id);
      setTyped('');
      setFound(null);
      setMode('tv');
      showInfo();
    },
    [showInfo],
  );

  const tuneNumber = useCallback(
    (num: number) => {
      const ch = index.byNumber.get(num);
      if (ch) {
        tune(ch.id);
      } else {
        setFound(false);
        if (typeTimer.current) window.clearTimeout(typeTimer.current);
        typeTimer.current = window.setTimeout(() => {
          setTyped('');
          setFound(null);
        }, TYPE_MS);
      }
    },
    [index, tune],
  );

  const stepChannel = useCallback(
    (delta: number) => {
      if (index.list.length === 0) return;
      const pos = current ? index.list.findIndex((c) => c.id === current.id) : 0;
      const nextPos = (pos + delta + index.list.length) % index.list.length;
      tune(index.list[nextPos].id);
    },
    [index, current, tune],
  );

  const changeVolume = useCallback((delta: number) => {
    setVolume((v) => Math.min(1, Math.max(0, Math.round((v + delta) * 10) / 10)));
    setShowVolume(true);
    if (osdTimer.current) window.clearTimeout(osdTimer.current);
    osdTimer.current = window.setTimeout(() => setShowVolume(false), OSD_MS);
  }, []);

  const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handlerRef.current = (e: KeyboardEvent) => {
    const key = e.key;
    const isBack = key === 'Escape' || key === 'Backspace' || key === 'BrowserBack' || key === 'GoBack';

    if (mode === 'sidebar') {
      if (isBack) {
        e.preventDefault();
        setMode('tv');
      }
      return;
    }

    if (mode === 'settings') {
      if (isBack) {
        e.preventDefault();
        setMode('tv');
      }
      return;
    }

    if (mode !== 'tv') return;

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      const next = (typedRef.current + key).slice(0, 4);
      setTyped(next);
      setFound(null);
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
      typeTimer.current = window.setTimeout(() => tuneNumber(Number.parseInt(next, 10)), TYPE_MS);
      return;
    }
    if (key === 'ChannelUp' || key === 'PageUp' || key === 'ArrowUp') {
      e.preventDefault();
      stepChannel(1);
      return;
    }
    if (key === 'ChannelDown' || key === 'PageDown' || key === 'ArrowDown') {
      e.preventDefault();
      stepChannel(-1);
      return;
    }
    if (key === 'ArrowRight') {
      e.preventDefault();
      changeVolume(0.1);
      return;
    }
    if (key === 'ArrowLeft') {
      e.preventDefault();
      changeVolume(-0.1);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (typedRef.current) {
        if (typeTimer.current) window.clearTimeout(typeTimer.current);
        tuneNumber(Number.parseInt(typedRef.current, 10));
      } else {
        toggleOverlay();
      }
      return;
    }
    if (isBack) {
      e.preventDefault();
      if (overlay) {
        setOverlay(false);
      } else {
        setMode('sidebar');
      }
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  useEffect(() => {
    if (mode === 'sidebar') {
      const t = window.setTimeout(() => focusFirst(), 60);
      return () => window.clearTimeout(t);
    }
  }, [mode]);

  const onSetNumber = useCallback((id: string, value: number | null) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === null) delete next[id];
      else next[id] = value;
      return next;
    });
  }, []);

  const onResetNumbers = useCallback(() => setOverrides({}), []);
  const onEpgChanged = useCallback(() => undefined, []);

  const currentNNEntry = current ? currentNN[channelKey(current)] : undefined;

  if (loading || mode === 'loading') {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        Ligando a TV...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">Nao foi possivel carregar os canais</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => void reload()}>
          <RotateCw /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {current && (
        <TvPlayer
          channel={current}
          volume={volume}
          onStatus={(status, message) => {
            setPlayStatus(status);
            setPlayError(message ?? '');
          }}
        />
      )}

      <div className="absolute inset-0 z-10" onClick={toggleOverlay} />

      {current && playStatus === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/85 text-center text-white">
          <p className="text-xl font-semibold">Canal indisponivel</p>
          <p className="max-w-md text-sm text-white/60">{playError}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => stepChannel(-1)}>
              Canal anterior
            </Button>
            <Button onClick={() => stepChannel(1)}>Próximo canal</Button>
          </div>
        </div>
      )}

      {current && playStatus === 'loading' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg bg-black/70 px-5 py-3 text-white">
            <Loader2 className="size-5 animate-spin" /> Sintonizando...
          </div>
        </div>
      )}

      {current && overlay && (
        <PlayerOverlay
          channel={current}
          nowNext={currentNNEntry}
          onMenu={() => setMode('sidebar')}
          onSettings={() => setMode('settings')}
          onPrev={() => stepChannel(-1)}
          onNext={() => stepChannel(1)}
        />
      )}

      {typed && <TypedNumber digits={typed} found={found} />}
      {showVolume && <VolumeOsd volume={volume} />}

      {mode === 'sidebar' && (
        <ChannelSidebar
          channels={index.list}
          groups={groups}
          activeGroup={activeGroup}
          currentId={currentId}
          nowNext={sidebarNN}
          onSelectGroup={setActiveGroup}
          onTune={(ch) => tune(ch.id)}
          onOpenSettings={() => setMode('settings')}
          onClose={() => setMode('tv')}
        />
      )}

      {mode === 'settings' && (
        <SettingsScreen
          channels={index.list}
          overrides={overrides}
          onSetNumber={onSetNumber}
          onResetNumbers={onResetNumbers}
          onEpgChanged={onEpgChanged}
          onBack={() => setMode('tv')}
        />
      )}
    </div>
  );
}
