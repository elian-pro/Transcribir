import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileVideo, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ChevronRight,
  RefreshCw,
  Zap,
  Key,
  ShieldCheck,
  ExternalLink
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
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar API Key del entorno o localStorage al inicio
  useEffect(() => {
    // Primero verificar si hay una API_KEY del entorno (configurada en Easy Panel)
    const envKey = process.env.API_KEY;
    if (envKey) {
      setApiKey(envKey);
      setShowKeyInput(false);
      return;
    }

    // Si no hay en el entorno, verificar localStorage
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setShowKeyInput(false);
    }
  }, []);

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

  const saveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      setShowKeyInput(false);
    }
  };

  const processFile = async () => {
    if (!file) return;
    if (!apiKey.trim()) {
      setError("Necesitas una API Key para realizar la transcripción.");
      setShowKeyInput(true);
      return;
    }

    try {
      setStatus(AppStatus.EXTRACTING_AUDIO);
      setError(null);
      setProgress(15);

      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 5 : prev));
      }, 800);

      const { base64, duration } = await extractAudioFromVideo(file);
      
      setStatus(AppStatus.TRANSCRIBING);
      const text = await transcribeAudio(base64, apiKey);
      
      clearInterval(progressInterval);
      setProgress(100);

      setResult({ text, duration });
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo procesar el vídeo. Verifica que tu API Key sea válida.");
      setStatus(AppStatus.ERROR);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.text);
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

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-blue-500/30">
      <header className="w-full max-w-4xl mb-12 text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
          <Zap size={14} /> AI Video Transcriber
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Video a Texto
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Sube tu vídeo, extrae el audio y transcribe con inteligencia artificial.
        </p>

        {/* API Key Management UI */}
        <div className="max-w-md mx-auto mb-12">
          {showKeyInput ? (
            <form onSubmit={saveKey} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-2 text-left">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Configurar API Key</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Requerido para la IA</p>
                </div>
              </div>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Introduce tu Gemini API Key..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                required
              />
              <div className="flex items-center justify-between gap-4">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Obtener clave gratis <ExternalLink size={10} />
                </a>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-green-500" size={18} />
                <span className="text-sm font-medium text-slate-300">API Key Configurada</span>
              </div>
              <button 
                onClick={() => setShowKeyInput(true)}
                className="text-xs text-slate-500 hover:text-white transition-colors underline"
              >
                Cambiar
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-3xl flex-grow">
        {status === AppStatus.IDLE && (
          <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-dashed border-slate-800 hover:border-slate-700 transition-all group">
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
                  <h2 className="text-2xl font-bold mb-2">Selecciona un vídeo</h2>
                  <p className="text-slate-500 mb-8">El audio será procesado localmente en tu navegador</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-95"
                  >
                    Elegir Archivo
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
                    <button onClick={reset} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"><RefreshCw size={18} /></button>
                  </div>
                  <button 
                    onClick={processFile}
                    disabled={!apiKey}
                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                      apiKey 
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {apiKey ? 'Iniciar Transcripción' : 'Falta API Key'} <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING) && (
          <div className="glass-panel p-16 rounded-[2.5rem] text-center space-y-8">
            <Loader2 className="animate-spin text-blue-400 mx-auto" size={48} />
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">
                {status === AppStatus.EXTRACTING_AUDIO ? 'Extrayendo Audio...' : 'IA Transcribiendo...'}
              </h3>
              <div className="max-w-xs mx-auto">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-600">{progress}% Completado</p>
              </div>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="glass-panel p-10 rounded-[2.5rem] border-2 border-red-500/20 text-center">
            <AlertCircle className="text-red-500 mx-auto mb-6" size={48} />
            <h3 className="text-2xl font-bold text-red-100 mb-3">Error</h3>
            <p className="text-slate-400 mb-8">{error}</p>
            <button onClick={reset} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">Reintentar</button>
          </div>
        )}

        {status === AppStatus.COMPLETED && result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] border border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <CheckCircle2 className="text-green-500" size={32} />
                <h4 className="font-bold text-xl">Proceso Finalizado</h4>
              </div>
              <div className="flex gap-3">
                <button onClick={copyToClipboard} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"><Copy size={18} /> Copiar</button>
                <button onClick={reset} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl"><RefreshCw size={20} /></button>
              </div>
            </div>
            <div className="glass-panel p-8 rounded-[2rem] relative shadow-2xl min-h-[200px]">
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                {result.text}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl py-10 text-center border-t border-slate-800/50 mt-12">
        <p className="text-slate-600 text-xs font-medium uppercase tracking-widest">
          Video Transcriber &bull; Sin servidores intermedios &bull; 100% Privado
        </p>
      </footer>
    </div>
  );
}
