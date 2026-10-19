import React from 'react';
import { QueueItem } from '../types';
import FileItem from './FileItem';

interface FileQueueProps {
  items: QueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onClear: () => void;
}

export default function FileQueue({ items, selectedId, onSelect, onRemove, onRetry, onClear }: FileQueueProps) {
  const pending = items.filter((i) => i.status !== 'done' && i.status !== 'error').length;
  const finished = items.length - pending;

  return (
    <div className="rounded-card bg-surface border border-line shadow-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label">Cola de archivos</span>
        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          <span>
            {items.length} {items.length === 1 ? 'archivo' : 'archivos'}
            {pending > 0 ? ` · ${pending} pendiente${pending === 1 ? '' : 's'}` : ''}
          </span>
          {finished > 0 && items.length > 1 && (
            <button onClick={onClear} className="underline underline-offset-4 hover:text-fg transition-colors">
              Limpiar terminados
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
        {items.map((item) => (
          <FileItem
            key={item.id}
            file={item.file}
            status={item.status}
            duration={item.duration}
            selected={item.id === selectedId}
            onSelect={() => onSelect(item.id)}
            onRemove={() => onRemove(item.id)}
            onRetry={() => onRetry(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
