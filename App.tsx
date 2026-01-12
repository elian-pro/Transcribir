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
  RefreshCw,
  Zap
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
      setProgress(0);
    } else if (selectedFile) {
      setError("Por favor, selecciona un archivo de vídeo válido (MP4, MOV, etc).");
    }
  };

  const processFile = async () => {
    if (!file) return;

    try {
      setStatus(AppStatus.EXTRACTING_AUDIO);
      setError(null);
      setProgress(15);

      // Simulación de progreso para feedback visual
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 5 : prev));
      }, 800);

      // Step 1: Extract Audio (Client-side)
      const { base64, duration } = await extractAudioFromVideo(file);
      
      // Step 2: Transcribe via Gemini
      setStatus(AppStatus.TRANSCRIBING);
      const text = await transcribeAudio(base64);
      
      clearInterval(progressInterval);
      setProgress(100);

      setResult({ text, duration });
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo procesar el vídeo. Asegúrate de que la API Key esté configurada correctamente.");
      setStatus(AppStatus.ERROR);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.text);
      // Podrías añadir un toast aquí
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
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-blue-500/30">
      {/* Header */}
      <header className="w-full max-w-4xl mb-12 text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
          <Zap size={14} /> Powered by Gemini AI
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Video Transcriber
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
          Convierte tus vídeos en texto de alta precisión en segundos. Privacidad garantizada mediante procesamiento local de audio.
        </p>
      </header>

      <main className="w-full max-w-3xl flex-grow">
        {/* State: IDLE */}
        {status === AppStatus.IDLE && (
          <div 
            className={`glass-panel p-10 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 group ${
              file ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <Upload className="text-blue-400" size={32} />
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
              />
              
              {!file ? (
                <>
                  <h2 className="text-2xl font-bold mb-2">Sube tu archivo</h2>
                  <p className="text-slate-500 mb-8">Arrastra o selecciona un vídeo MP4 para comenzar</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-xl shadow-white/5"
                  >
                    Seleccionar Vídeo
                  </button>
                </>
              ) : (
                <div className="w-full space-y-6">
                  <div className="flex items-center gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800 text-left">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <FileVideo className="text-blue-400" size={24} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold truncate text-slate-100">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={reset}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={processFile}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    Empezar Transcripción <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State: PROCESSING */}
        {(status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING) && (
          <div className="glass-panel p-16 rounded-[2.5rem] text-center space-y-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping opacity-20 bg-blue-500 rounded-full"></div>
                <div className="relative bg-slate-800 p-8 rounded-full border border-slate-700">
                  <Loader2 className="animate-spin text-blue-400" size={48} />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">
                {status === AppStatus.EXTRACTING_AUDIO ? 'Extrayendo Audio...' : 'Analizando con IA...'}
              </h3>
              <p className="text-slate-400">Esto puede tomar unos segundos dependiendo de la duración.</p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-600">{progress}% Completado</p>
            </div>
          </div>
        )}

        {/* State: ERROR */}
        {status === AppStatus.ERROR && (
          <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-red-500/20 bg-red-500/5 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-red-100 mb-3">Error en el proceso</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">{error}</p>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* State: COMPLETED */}
        {status === AppStatus.COMPLETED && result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] border border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                  <CheckCircle2 className="text-green-500" size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-xl">Transcripción Exitosa</h4>
                  <p className="text-sm text-slate-500">Duración detectada: <span className="text-slate-300 font-mono">{formatDuration(result.duration)}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                >
                  <Copy size={18} /> Copiar
                </button>
                <button 
                  onClick={reset}
                  className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2rem] relative shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 bg-slate-800/80 rounded-bl-2xl border-l border-b border-slate-700 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                Gemini AI Output
              </div>
              <div className="mt-6 prose prose-invert max-w-none">
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {result.text}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl py-10 text-center border-t border-slate-800/50 mt-12">
        <p className="text-slate-600 text-xs font-medium uppercase tracking-widest">
          Video Transcriber Pro &bull; {new Date().getFullYear()} &bull; Secure & Fast
        </p>
      </footer>
    </div>
  );
}
