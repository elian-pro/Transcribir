export enum AppStatus {
  IDLE = 'IDLE',
  EXTRACTING_AUDIO = 'EXTRACTING_AUDIO',
  TRANSCRIBING = 'TRANSCRIBING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  /** Tiempo real que tardó el proceso completo, en milisegundos. */
  elapsedMs: number;
  fileName: string;
}
