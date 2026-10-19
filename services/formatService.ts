import { Segment } from '../types';

function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}

/** 00:01:05 */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** 00:01:05,250 (formato de tiempo de SRT) */
export function formatSrtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return `${formatClock(ms / 1000)},${pad(ms % 1000, 3)}`;
}

/** Acepta "SS", "MM:SS", "HH:MM:SS" (con decimales opcionales) o un número. Devuelve NaN si no se entiende. */
export function parseTimestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const parts = value.trim().replace(',', '.').split(':');
  if (parts.length > 3 || parts.some((p) => p === '' || isNaN(Number(p)))) return NaN;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

export function hasMultipleSpeakers(segments: Segment[]): boolean {
  return new Set(segments.map((s) => s.speaker)).size > 1;
}

export interface Paragraph {
  speaker: string;
  start: number;
  text: string;
}

/** Junta segmentos consecutivos del mismo orador en un párrafo. */
export function toParagraphs(segments: Segment[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const seg of segments) {
    const last = paragraphs[paragraphs.length - 1];
    if (last && last.speaker === seg.speaker) last.text += ` ${seg.text}`;
    else paragraphs.push({ speaker: seg.speaker, start: seg.start, text: seg.text });
  }
  return paragraphs;
}

export function toPlainText(segments: Segment[]): string {
  const multi = hasMultipleSpeakers(segments);
  return toParagraphs(segments)
    .map((p) => (multi ? `[${p.speaker}]: ${p.text}` : p.text))
    .join('\n\n');
}

export function toSrt(segments: Segment[]): string {
  const multi = hasMultipleSpeakers(segments);
  return segments
    .map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${multi ? `${s.speaker}: ` : ''}${s.text}`)
    .join('\n\n') + '\n';
}

export function toTimestamps(segments: Segment[]): string {
  const multi = hasMultipleSpeakers(segments);
  return segments.map((s) => `[${formatClock(s.start)}] ${multi ? `${s.speaker}: ` : ''}${s.text}`).join('\n');
}
