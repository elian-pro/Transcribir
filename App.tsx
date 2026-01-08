
import React, { useState, useCallback, useRef } from 'react';
import { 
  FileVideo, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  FileAudio,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { extractAudioFromVideo } from './services/audioService';
import { transcribeAudio } from './services/geminiService';
import { AppStatus, TranscriptionResult } from './types';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setStatus(AppStatus.IDLE);
    } else {
      setError("Por favor, selecciona un archivo de vídeo válido (MP4).");
    }
  };

  const processFile = async () => {
    if (!file) return;

    try {
      setStatus(AppStatus.EXTRACTING_AUDIO);
      setError(null);
      setProgress(25);

      // Step 1: Extract Audio
      const { base64, duration } = await extractAudioFromVideo(file);
      setProgress(50);

      // Step 2: Transcribe via Gemini
      setStatus(AppStatus.TRANSCRIBING);
      const text = await transcribeAudio(base64);
      setProgress(100);

      setResult({ text, duration });
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado durante el procesamiento.");
      setStatus(AppStatus.ERROR);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.text);
      alert("Transcripción copiada al portapapeles");
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setStatus(AppStatus.IDLE);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl mb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 mb-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
          <FileVideo size={32} className="text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Video Transcriber Pro
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Extrae el audio de tus vídeos MP4 y genera transcripciones precisas en segundos utilizando Inteligencia Artificial.
        </p>
      </header>

      <main className="w-full max-w-3xl">
        {/* Upload Section */}
        {status === AppStatus.IDLE && (
          <div className="glass-panel p-8 rounded-3xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <Upload className="text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Sube tu vídeo</h2>
              <p className="text-slate-500 mb-8">Formatos soportados: MP4, MOV, WebM</p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors mb-4"
              >
                Seleccionar Archivo
              </button>

              {file && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl w-full flex items-center justify-between border border-slate-700">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileVideo className="text-blue-400 flex-shrink-0" size={20} />
                    <span className="text-sm font-medium truncate text-slate-200">{file.name}</span>
                  </div>
                  <button 
                    onClick={processFile}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shrink-0 ml-4"
                  >
                    Transcribir Ahora <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading / Progress State */}
        {(status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING) && (
          <div className="glass-panel p-12 rounded-3xl text-center">
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>
              <div className="relative bg-slate-800 p-6 rounded-full">
                <Loader2 className="animate-spin text-blue-400" size={40} />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4">
              {status === AppStatus.EXTRACTING_AUDIO ? 'Extrayendo Audio...' : 'Analizando y Transcribiendo...'}
            </h3>
            <div className="w-full bg-slate-800 h-2 rounded-full mb-4 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-700 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-slate-400">
              {status === AppStatus.EXTRACTING_AUDIO 
                ? 'Estamos convirtiendo tu vídeo en formato de audio de alta calidad.' 
                : 'Gemini AI está procesando el lenguaje para crear tu transcripción.'}
            </p>
          </div>
        )}

        {/* Error State */}
        {status === AppStatus.ERROR && (
          <div className="glass-panel p-8 rounded-3xl border-2 border-red-500/30 bg-red-500/5 text-center">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-red-400 mb-2">Error en el proceso</h3>
            <p className="text-slate-400 mb-8">{error}</p>
            <button 
              onClick={reset}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Success State */}
        {status === AppStatus.COMPLETED && result && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-green-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-3 rounded-2xl">
                  <CheckCircle2 className="text-green-500" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">¡Listo! Transcripción finalizada</h4>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><FileAudio size={14} /> Audio extraído</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>Duración: {formatDuration(result.duration)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-slate-200"
                  title="Copiar texto"
                >
                  <Copy size={20} />
                </button>
                <button 
                  onClick={reset}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
                >
                  <RefreshCw size={18} /> Nuevo vídeo
                </button>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-3xl relative min-h-[300px]">
              <div className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                Output de Gemini AI
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {result.text}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-slate-600 text-sm">
        &copy; {new Date().getFullYear()} Video Transcriber Pro — Desarrollado con Gemini 3 Flash
      </footer>
    </div>
  );
}
