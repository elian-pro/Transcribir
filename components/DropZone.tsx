import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

export const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB
const ACCEPTED_EXTENSIONS = /\.(mp4|mov|m4v|webm|mkv|mp3|wav|m4a|aac|ogg|flac)$/i;

interface DropZoneProps {
  disabled?: boolean;
  onFile: (file: File) => void;
  onInvalid: (message: string) => void;
}

function validate(file: File): string | null {
  const typeOk = file.type.startsWith('video/') || file.type.startsWith('audio/') || ACCEPTED_EXTENSIONS.test(file.name);
  if (!typeOk) return 'Ese archivo no es de audio ni de video. Usa MP4, MOV, MP3, WAV, M4A o AAC.';
  if (file.size > MAX_FILE_BYTES) return 'El archivo pasa de 500 MB. Comprímelo o recórtalo antes de subirlo.';
  return null;
}

export default function DropZone({ disabled, onFile, onInvalid }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file?: File) => {
    if (!file) return;
    const problem = validate(file);
    if (problem) onInvalid(problem);
    else onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handle(e.dataTransfer.files?.[0]);
      }}
      className={`group rounded-card border border-dashed bg-surface p-10 min-h-[290px] flex flex-col items-center justify-center text-center transition-colors ${
        disabled
          ? 'border-line opacity-60 cursor-not-allowed'
          : dragging
            ? 'border-accent shadow-md cursor-pointer'
            : 'border-line-strong hover:border-muted cursor-pointer'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.aac"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="w-14 h-14 rounded-card bg-surface-2 border border-line text-fg flex items-center justify-center mb-5 transition-colors group-hover:bg-accent group-hover:text-on-accent">
        <Upload strokeWidth={1.5} size={26} />
      </div>
      <p className="text-base font-medium text-fg mb-1">
        Arrastra tu archivo o <span className="underline underline-offset-4">examinar</span>
      </p>
      <p className="text-sm text-muted">MP4, MOV, MP3, WAV, M4A, AAC (máx. 500 MB)</p>
    </div>
  );
}
