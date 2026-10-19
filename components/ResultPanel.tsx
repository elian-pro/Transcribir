import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Check, FileText, Loader2, RefreshCw } from 'lucide-react';
import { AppStatus, TranscriptionResult } from '../types';
import { baseName, countWords, downloadText, formatDuration } from '../utils/format';

interface ResultPanelProps {
  status: AppStatus;
  result: TranscriptionResult | null;
  error: string | null;
  onRetry: () => void;
}

const toolBtn =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function ResultPanel({ status, result, error, onRetry }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const done = status === AppStatus.COMPLETED && result;

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-card bg-surface border border-line shadow-card flex flex-col min-h-[360px] lg:min-h-[580px]">
      {/* Barra de herramientas */}
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
        <span className="label">Transcripción</span>
        <div className="flex items-center gap-2">
          <button onClick={copy} disabled={!done} className={`${toolBtn} border border-line text-fg hover:border-line-strong hover:bg-surface-2`}>
            {copied ? <Check strokeWidth={1.75} size={16} /> : <Copy strokeWidth={1.5} size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={() => result && downloadText(result.text, `${baseName(result.fileName)}.txt`)}
            disabled={!done}
            className={`${toolBtn} bg-accent text-on-accent hover:opacity-90`}
          >
            <FileText strokeWidth={1.5} size={16} /> .TXT
          </button>
        </div>
      </div>

      {/* Métricas reales */}
      {done && (
        <div className="px-4 py-2 border-b border-line flex items-center gap-2 font-mono text-xs text-muted">
          <span>{countWords(result.text).toLocaleString('es-MX')} palabras</span>
          <span>·</span>
          <span>{formatDuration(result.duration)} de audio</span>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 p-6 overflow-y-auto lg:max-h-[560px]">
        {status === AppStatus.IDLE && (
          <div className="h-full min-h-[240px] lg:min-h-[420px] flex flex-col items-center justify-center text-center gap-3">
            <FileText strokeWidth={1.5} size={28} className="text-muted" />
            <p className="text-fg font-medium">La transcripción aparecerá aquí.</p>
            <p className="text-sm text-muted max-w-xs">Sube un archivo y presiona Transcribir para empezar.</p>
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

        {done && (
          <div className="text-base leading-7 text-fg whitespace-pre-wrap text-left">{result.text}</div>
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
