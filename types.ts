export enum AppStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  EXTRACTING_AUDIO = 'EXTRACTING_AUDIO',
  TRANSCRIBING = 'TRANSCRIBING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

/** Un fragmento de la transcripción con sus tiempos, en segundos. */
export interface Segment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface Summary {
  summary: string;
  keyPoints: string[];
}

export interface TranscriptionResult {
  segments: Segment[];
  /** Traducciones ya generadas, por código de idioma; conservan los tiempos. */
  translations?: Record<string, Segment[]>;
  summary?: Summary;
  /** Texto plano derivado de los segmentos. */
  text: string;
  duration: number;
  /** Tiempo real que tardó el proceso completo, en milisegundos. */
  elapsedMs: number;
  fileName: string;
}

export type QueueStatus = 'queued' | 'extracting' | 'transcribing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  duration?: number;
  result?: TranscriptionResult;
  error?: string;
}
