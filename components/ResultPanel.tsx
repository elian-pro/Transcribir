import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Clock, Copy, Check, Download, FileText, Languages, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { AppStatus, TranscriptionResult } from '../types';
import { baseName, countWords, downloadText, formatDuration } from '../utils/format';
import { formatClock, hasMultipleSpeakers, toParagraphs, toPlainText, toSrt, toTimestamps } from '../services/formatService';
import { LANGUAGES, LanguageCode, languageName, summaryToText } from '../services/aiToolsService';

interface ResultPanelProps {
  status: AppStatus;
  result: TranscriptionResult | null;
  error: string | null;
  onRetry: () => void;
  /** Genera (y guarda en el archivo) la traducción al idioma indicado. */
  onTranslate: (language: LanguageCode) => Promise<void>;
  /** Genera (y guarda en el archivo) el resumen. */
  onSummarize: () => Promise<void>;
}

type Tab = 'text' | 'srt' | 'timestamps' | 'summary';
type View = 'original' | LanguageCode;

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'text', label: 'Texto', short: 'Texto' },
  { id: 'srt', label: 'Subtítulos .SRT', short: '.SRT' },
  { id: 'timestamps', label: 'Marcas de tiempo', short: 'Tiempos' },
  { id: 'summary', label: 'Resumen', short: 'Resumen' },
];

const toolBtn =
  'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-control text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function ResultPanel({ status, result, error, onRetry, onTranslate, onSummarize }: ResultPanelProps) {
  const [tab, setTab] = useState<Tab>('text');
  const [view, setView] = useState<View>('original');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'translate' | 'summary' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const done = status === AppStatus.COMPLETED && result;

  // Segmentos que se muestran y exportan: los originales o una traducción ya generada.
  const segments = result ? (view === 'original' ? result.segments : result.translations?.[view]) ?? result.segments : [];

  const views = useMemo(() => {
    if (!result) return null;
    return {
      text: toPlainText(segments),
      srt: toSrt(segments),
      timestamps: toTimestamps(segments),
      summary: result.summary ? summaryToText(result.summary) : '',
      paragraphs: toParagraphs(segments),
      multi: hasMultipleSpeakers(segments),
    };
  }, [result, segments]);

  const copy = async () => {
    if (!views || !views[tab]) return;
    await navigator.clipboard.writeText(views[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const translate = async (language: LanguageCode) => {
    setMenuOpen(false);
    setActionError(null);
    if (result?.translations?.[language]) {
      setView(language);
      return;
    }
    setBusy('translate');
    try {
      await onTranslate(language);
      setView(language);
      if (tab === 'summary') setTab('text');
    } catch (err: any) {
      setActionError(err.message || 'No se pudo traducir. Intenta de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const summarize = async () => {
    setTab('summary');
    setActionError(null);
    if (result?.summary) return;
    setBusy('summary');
    try {
      await onSummarize();
    } catch (err: any) {
      setActionError(err.message || 'No se pudo generar el resumen. Intenta de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const name = result ? `${baseName(result.fileName)}${view === 'original' ? '' : `-${view}`}` : 'transcripcion';

  return (
    <div className="theme-light rounded-card bg-surface border border-line shadow-card flex flex-col min-h-[360px] lg:min-h-[580px]">
      {/* Pestañas y acciones */}
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" data-ds-theme="dark" className="flex w-full sm:w-auto items-center gap-1 bg-surface-2 border border-line p-0.5 rounded-control">
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
        <div data-ds-theme="dark" className="focus-on-light flex items-center gap-2">
          <button onClick={copy} disabled={!done || !views?.[tab]} className={`${toolBtn} bg-surface border border-line text-fg hover:border-line-strong hover:bg-surface-2`}>
            {copied ? <Check strokeWidth={1.75} size={16} /> : <Copy strokeWidth={1.5} size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={() => views && downloadText(views.text, `${name}.txt`)}
            disabled={!done}
            className={`${toolBtn} bg-surface border border-line text-fg hover:border-line-strong hover:bg-surface-2`}
          >
            <FileText strokeWidth={1.5} size={16} /> .TXT
          </button>
          <button
            onClick={() => views && downloadText(views.srt, `${name}.srt`)}
            disabled={!done}
            className={`${toolBtn} edge-on-light bg-accent text-on-accent hover:opacity-90`}
          >
            <Download strokeWidth={1.5} size={16} /> <span className="hidden sm:inline">Exportar</span> .SRT
          </button>
        </div>
      </div>

      {/* Métricas reales */}
      {done && (
        <div className="px-4 py-2 border-b border-line flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
          <span>{countWords(views?.text || '').toLocaleString('es-MX')} palabras</span>
          <span>·</span>
          <span>{formatDuration(result.duration)} de audio</span>
          <span>·</span>
          <span>{result.segments.length} segmentos</span>
          {view !== 'original' && tab !== 'summary' && (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-fg">Traducción: {languageName(view)}</span>
              <button onClick={() => setView('original')} className="underline underline-offset-4 hover:text-fg transition-colors">
                Ver original
              </button>
            </span>
          )}
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
            <button onClick={onRetry} data-ds-theme="dark" className={`focus-on-light ${toolBtn} bg-surface border border-line text-fg hover:border-line-strong hover:bg-surface-2`}>
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

        {done && tab === 'summary' && (
          <div className="text-left">
            {result.summary ? (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="label mb-2">Resumen</p>
                  <p className="text-base leading-7 text-fg">{result.summary.summary}</p>
                </div>
                <div>
                  <p className="label mb-3">Puntos clave</p>
                  <ul className="flex flex-col gap-3">
                    {result.summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-6 text-fg">
                        <span className="font-mono text-xs text-muted pt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : busy === 'summary' ? (
              <div className="min-h-[240px] flex flex-col items-center justify-center text-center gap-3">
                <Loader2 strokeWidth={1.5} size={24} className="animate-spin text-fg" />
                <p className="text-fg font-medium">Generando resumen…</p>
              </div>
            ) : (
              <div className="min-h-[240px] flex flex-col items-center justify-center text-center gap-4">
                <Sparkles strokeWidth={1.5} size={28} className="text-muted" />
                <p className="text-sm text-muted max-w-xs">Genera un resumen breve con los puntos clave de esta transcripción.</p>
                <button onClick={summarize} data-ds-theme="dark" className={`focus-on-light ${toolBtn} edge-on-light bg-accent text-on-accent hover:opacity-90`}>
                  <Sparkles strokeWidth={1.5} size={16} /> Generar resumen
                </button>
              </div>
            )}
          </div>
        )}

        {done && tab === 'timestamps' && (
          <div className="flex flex-col gap-1 text-left">
            {segments.map((s, i) => (
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
        <div className="px-4 py-3 border-t border-line flex flex-col gap-2">
          {actionError && (
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle strokeWidth={1.5} size={16} className="shrink-0 mt-0.5" /> {actionError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span className="flex items-center gap-2">
              <CheckCircle2 strokeWidth={1.5} size={16} className="text-fg" />
              Transcripción completada en {(result.elapsedMs / 1000).toFixed(1)} segundos
            </span>
            <div data-ds-theme="dark" className="focus-on-light flex items-center gap-1">
              <div
                ref={menuRef}
                className="relative"
                onBlur={(e) => {
                  if (!menuRef.current?.contains(e.relatedTarget as Node)) setMenuOpen(false);
                }}
              >
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  disabled={busy !== null}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`${toolBtn} bg-surface text-muted hover:text-fg hover:bg-surface-2`}
                >
                  {busy === 'translate' ? <Loader2 strokeWidth={1.5} size={16} className="animate-spin" /> : <Languages strokeWidth={1.5} size={16} />}
                  {busy === 'translate' ? 'Traduciendo…' : 'Traducir'}
                  <ChevronDown strokeWidth={1.5} size={14} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-44 rounded-control bg-surface-2 border border-line shadow-lg p-1 z-10">
                    <button
                      role="menuitemradio"
                      aria-checked={view === 'original'}
                      onClick={() => {
                        setView('original');
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-chip text-sm text-fg hover:bg-surface"
                    >
                      Original {view === 'original' && <Check strokeWidth={1.75} size={14} />}
                    </button>
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        role="menuitemradio"
                        aria-checked={view === l.code}
                        onClick={() => translate(l.code)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-chip text-sm text-fg hover:bg-surface"
                      >
                        {l.name} {view === l.code && <Check strokeWidth={1.75} size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={summarize} disabled={busy !== null} className={`${toolBtn} bg-surface text-muted hover:text-fg hover:bg-surface-2`}>
                {busy === 'summary' ? <Loader2 strokeWidth={1.5} size={16} className="animate-spin" /> : <Sparkles strokeWidth={1.5} size={16} />}
                Resumen IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
