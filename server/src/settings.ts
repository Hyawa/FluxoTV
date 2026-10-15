import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DATA_DIR, EPG_DEFAULT_URL, SETTINGS_FILE } from './config';

export interface Settings {
  epgUrl: string;
}

let current: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (current) return current;
  try {
    const raw = await readFile(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Settings>;
    current = { epgUrl: parsed.epgUrl ?? EPG_DEFAULT_URL };
  } catch {
    current = { epgUrl: EPG_DEFAULT_URL };
  }
  return current;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  const next: Settings = { ...cur };
  if (patch.epgUrl !== undefined) next.epgUrl = patch.epgUrl;
  current = next;
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(SETTINGS_FILE, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.warn('[settings] nao foi possivel salvar:', (err as Error).message);
  }
  return current;
}
