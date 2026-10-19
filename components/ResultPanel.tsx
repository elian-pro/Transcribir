import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Copy, Check, Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { AppStatus, TranscriptionResult } from '../types';
import { baseName, countWords, downloadText, formatDuration } from '../utils/format';
import { formatClock, hasMultipleSpeakers, toParagraphs, toSrt, toTimestamps } from '../services/formatService';

interface ResultPanelProps {
  status: AppStatus;
  result: TranscriptionResult | null;
  error: string | null;
  onRetry: () => void;
}

type Tab = 'text' | 'srt' | 'timestamps';

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'text', label: 'Texto', short: 'Texto' },
  { id: 'srt', label: 'Subtítulos .SRT', short: '.SRT' },
  { id: 'timestamps', label: 'Marcas de tiempo', short: 'Tiempos' },
];

const toolBtn =
  'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-control text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function ResultPanel({ status, result, error, onRetry }: ResultPanelProps) {
  const [tab, setTab] = useState<Tab>('text');
  const [copied, setCopied] = useState(false);
  const done = status === AppStatus.COMPLETED && result;

  const views = useMemo(() => {
    if (!result) return null;
    return {
      text: result.text,
      srt: toSrt(result.segments),
      timestamps: toTimestamps(result.segments),
      paragraphs: toParagraphs(result.segments),
      multi: hasMultipleSpeakers(result.segments),
    };
  }, [result]);

  const copy = async () => {
    if (!views) return;
    await navigator.clipboard.writeText(views[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const name = result ? baseName(result.fileName) : 'transcripcion';

  return (
    <div className="rounded-card bg-surface border border-line shadow-card flex flex-col min-h-[360px] lg:min-h-[580px]">
      {/* Pestañas y acciones */}
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex w-full sm:w-auto items-center gap-1 bg-surface-2 border border-line p-0.5 rounded-control">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-label={t.label}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none whitespace-nowrap px-3 py-1.5 rounded-chip text-sm transition-colors ${
                tab === t.id ? 'bg-surface text-fg font-semibold shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} disabled={!done} className={`${toolBtn} border border-line text-fg hover:border-line-strong hover:bg-surface-2`}>
            {copied ? <Check strokeWidth={1.75} size={16} /> : <Copy strokeWidth={1.5} size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={() => views && downloadText(views.text, `${name}.txt`)}
            disabled={!done}
            className={`${toolBtn} border border-line text-fg hover:border-line-strong hover:bg-surface-2`}
          >
            <FileText strokeWidth={1.5} size={16} /> .TXT
          </button>
          <button
            onClick={() => views && downloadText(views.srt, `${name}.srt`)}
            disabled={!done}
            className={`${toolBtn} bg-accent text-on-accent hover:opacity-90`}
          >
            <Download strokeWidth={1.5} size={16} /> <span className="hidden sm:inline">Exportar</span> .SRT
          </button>
        </div>
      </div>

      {/* Métricas reales */}
      {done && (
        <div className="px-4 py-2 border-b border-line flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
          <span>{countWords(result.text).toLocaleString('es-MX')} palabras</span>
          <span>·</span>
          <span>{formatDuration(result.duration)} de audio</span>
          <span>·</span>
          <span>{result.segments.length} segmentos</span>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 p-6 overflow-y-auto lg:max-h-[560px]">
        {status === AppStatus.IDLE && (
          <div className="h-full min-h-[240px] lg:min-h-[420px] flex flex-col items-center justify-center text-center gap-3">
            <FileText strokeWidth={1.5} size={28} className="text-muted" />
            <p className="text-fg font-medium">La transcripción aparecerá aquí.</p>
            <p className="text-sm text-muted max-w-xs">Sube uno o varios archivos; se transcriben uno por uno, en orden.</p>
          </div>
        )}

        {status === AppStatus.QUEUED && (
          <div className="h-full min-h-[240px] lg:min-h-[420px] flex flex-col items-center justify-center text-center gap-3">
            <Clock strokeWidth={1.5} size={28} className="text-muted" />
            <p className="text-fg font-medium">En cola.</p>
            <p className="text-sm text-muted max-w-xs">Este archivo se procesará en cuanto terminen los anteriores.</p>
          </div>
        )}

        {(status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING) && (
          <div className="h-full min-h-[240px] lg:min-h-[420px] flex flex-col items-center justify-center text-center gap-4">
            <Loader2 strokeWidth={1.5} size={28} className="animate-spin text-fg" />
            <p className="text-xl font-semibold tracking-tight">
              {status === AppStatus.EXTRACTING_AUDIO ? 'Extrayendo audio…' : 'La IA está transcribiendo…'}
            </p>
            <p className="text-sm text-muted max-w-xs">
              {status === AppStatus.EXTRACTING_AUDIO
                ? 'Preparando el audio en tu navegador.'
                : 'Puede tardar unos minutos en archivos largos. No cierres esta pestaña.'}
            </p>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="h-full min-h-[240px] lg:min-h-[420px] flex flex-col items-center justify-center text-center gap-4">
            <AlertCircle strokeWidth={1.5} size={28} className="text-danger" />
            <p className="text-xl font-semibold tracking-tight">Algo salió mal.</p>
            <p className="text-sm text-muted max-w-md">{error}</p>
            <button onClick={onRetry} className={`${toolBtn} border border-line text-fg hover:border-line-strong hover:bg-surface-2`}>
              <RefreshCw strokeWidth={1.5} size={16} /> Reintentar
            </button>
          </div>
        )}

        {done && views && tab === 'text' && (
          <div className="flex flex-col gap-4 text-left">
            {views.paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-7 text-fg">
                {views.multi && <span className="label block mb-1">{p.speaker}</span>}
                {p.text}
              </p>
            ))}
          </div>
        )}

        {done && views && tab === 'srt' && (
          <pre className="font-mono text-xs leading-6 text-muted bg-surface-2 border border-line rounded-control p-4 whitespace-pre-wrap text-left">
            {views.srt}
          </pre>
        )}

        {done && tab === 'timestamps' && (
          <div className="flex flex-col gap-1 text-left">
            {result.segments.map((s, i) => (
              <div key={i} className="flex items-start gap-4 p-2 rounded-control hover:bg-surface-2 transition-colors">
                <span className="font-mono text-xs text-fg border border-line bg-surface-2 px-2 py-0.5 rounded-chip shrink-0 mt-0.5">
                  {formatClock(s.start)}
                </span>
                <div className="flex-1 min-w-0">
                  {views?.multi && <span className="label block mb-0.5">{s.speaker}</span>}
                  <p className="text-sm leading-6 text-fg">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pie */}
      {done && (
        <div className="px-4 py-3 border-t border-line flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 strokeWidth={1.5} size={16} className="text-fg" />
          Transcripción completada en {(result.elapsedMs / 1000).toFixed(1)} segundos
        </div>
      )}
    </div>
  );
}
