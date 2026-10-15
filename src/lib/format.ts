export function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRange(start: number, stop: number): string {
  return `${formatTime(start)} - ${formatTime(stop)}`;
}
