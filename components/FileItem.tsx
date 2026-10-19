import React from 'react';
import { FileVideo, FileAudio, X } from 'lucide-react';
import { formatBytes, formatDuration } from '../utils/format';

export type FileItemStatus = 'ready' | 'extracting' | 'transcribing' | 'done' | 'error';

const STATUS_LABEL: Record<FileItemStatus, string> = {
  ready: 'Listo',
  extracting: 'Extrayendo audio',
  transcribing: 'Transcribiendo',
  done: 'Completado',
  error: 'Error',
};

interface FileItemProps {
  file: File;
  status: FileItemStatus;
  duration?: number;
  onRemove?: () => void;
}

export default function FileItem({ file, status, duration, onRemove }: FileItemProps) {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name);
  const Icon = isVideo ? FileVideo : FileAudio;
  const busy = status === 'extracting' || status === 'transcribing';

  return (
    <div className="bg-surface-2 border border-line rounded-control p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-chip bg-surface border border-line text-fg flex items-center justify-center shrink-0">
            <Icon strokeWidth={1.5} size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg truncate">{file.name}</p>
            <p className="font-mono text-xs text-muted whitespace-nowrap">
              {formatBytes(file.size)}
              {duration ? ` · ${formatDuration(duration)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-chip border text-xs font-medium ${
              status === 'error' ? 'border-line text-danger' : status === 'done' ? 'border-accent text-fg' : 'border-line text-muted'
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          {onRemove && !busy && (
            <button
              onClick={onRemove}
              aria-label="Quitar archivo"
              className="p-1 rounded-chip text-muted hover:text-fg hover:bg-surface transition-colors"
            >
              <X strokeWidth={1.5} size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-surface h-1 rounded-full overflow-hidden">
        {busy ? (
          <div className="bar-indeterminate h-full bg-accent rounded-full" />
        ) : (
          <div className={`h-full rounded-full ${status === 'done' ? 'bg-accent w-full' : 'w-0'}`} />
        )}
      </div>
    </div>
  );
}
