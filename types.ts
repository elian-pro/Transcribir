export enum AppStatus {
  IDLE = 'IDLE',
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

export interface TranscriptionResult {
  segments: Segment[];
  /** Texto plano derivado de los segmentos. */
  text: string;
  duration: number;
  /** Tiempo real que tardó el proceso completo, en milisegundos. */
  elapsedMs: number;
  fileName: string;
}
