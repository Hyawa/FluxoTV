import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RotateCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  fetchEpgStatus,
  fetchSettings,
  saveSettings,
  type EpgStatus,
} from '@/lib/api';
import type { NumberedChannel } from '@/lib/channels';

interface SettingsScreenProps {
  channels: NumberedChannel[];
  overrides: Record<string, number>;
  onSetNumber: (id: string, value: number | null) => void;
  onResetNumbers: () => void;
  onEpgChanged: () => void;
  onBack: () => void;
}

function NumberInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <Input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = Number.parseInt(draft, 10);
        onCommit(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="h-9 w-24 text-center"
    />
  );
}

export function SettingsScreen({
  channels,
  overrides,
  onSetNumber,
  onResetNumbers,
  onEpgChanged,
  onBack,
}: SettingsScreenProps) {
  const [epgUrl, setEpgUrl] = useState('');
  const [status, setStatus] = useState<EpgStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const s = await fetchSettings();
        setEpgUrl(s.epgUrl);
        setStatus(await fetchEpgStatus());
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.number).includes(q),
    );
  }, [channels, query]);

  const handleSaveEpg = async () => {
    setSaving(true);
    try {
      await saveSettings({ epgUrl: epgUrl.trim() });
      onEpgChanged();
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const st = await fetchEpgStatus();
        setStatus(st);
        if (!st.loading && (st.channels > 0 || st.error)) break;
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="secondary" size="icon" onClick={onBack} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Configurações</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Programação (EPG)</h2>
            <p className="text-sm text-muted-foreground">
              Opcional. A lista de canais nao inclui a grade de programacao. Cole a URL de um arquivo
              XMLTV (por exemplo de um provedor de EPG) para exibir "Agora" e "A seguir". Sem EPG, o app
              continua funcionando normalmente.
            </p>
            <div className="flex gap-2">
              <Input
                value={epgUrl}
                onChange={(e) => setEpgUrl(e.target.value)}
                placeholder="https://.../guia.xml"
              />
              <Button onClick={() => void handleSaveEpg()} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
            {status && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {status.loading ? (
                  <Badge variant="secondary">Carregando EPG...</Badge>
                ) : status.error ? (
                  <Badge variant="destructive">Erro: {status.error}</Badge>
                ) : status.channels > 0 ? (
                  <Badge>{status.channels} canais com programacao</Badge>
                ) : (
                  <Badge variant="outline">EPG nao configurado</Badge>
                )}
                {status.updatedAt && <span>Atualizado: {new Date(status.updatedAt).toLocaleString('pt-BR')}</span>}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Numeros dos canais</h2>
                <p className="text-sm text-muted-foreground">
                  Defina o numero de cada canal (ex.: coloque a Globo no 5). Digite o numero e pressione
                  Enter.
                </p>
              </div>
              <Button variant="outline" onClick={onResetNumbers}>
                <RotateCw /> Restaurar
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar canal"
                className="pl-9"
              />
            </div>

            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {filtered.slice(0, 200).map((channel) => (
                <div key={channel.id + channel.url} className="flex items-center gap-4 p-3">
                  <NumberInput
                    value={channel.number}
                    onCommit={(value) => onSetNumber(channel.id, value)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{channel.name}</span>
                  {overrides[channel.id] !== undefined && (
                    <Badge variant="secondary">personalizado</Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
