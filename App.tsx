import React, { useState, useRef, useEffect } from 'react';
import {
  FileVideo,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  RefreshCw,
  Key,
  ExternalLink
} from 'lucide-react';
import { extractAudioFromVideo } from './services/audioService';
import { transcribeAudio } from './services/geminiService';
import { AppStatus, TranscriptionResult } from './types';

// Marcador amarillo estilo Zebra
const Mark = ({ children }: { children: React.ReactNode }) => (
  <span className="mark">
    <span className="mark-bar" aria-hidden="true" />
    <span className="mark-text">{children}</span>
  </span>
);

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(true);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar API Key del entorno o localStorage al inicio
  useEffect(() => {
    const envKey = process.env.API_KEY;
    if (envKey) {
      setApiKey(envKey);
      setShowKeyInput(false);
      return;
    }
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setShowKeyInput(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type.startsWith('video/') || selectedFile.type.startsWith('audio/'))) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setStatus(AppStatus.IDLE);
      setProgress(0);
    } else if (selectedFile) {
      setError("Por favor, selecciona un archivo de vídeo o audio válido (MP4, MP3, WAV, etc).");
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

      const { blob, duration } = await extractAudioFromVideo(file);

      setStatus(AppStatus.TRANSCRIBING);
      const text = await transcribeAudio(blob, apiKey);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
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
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 selection:bg-zebra selection:text-black">
      {/* Barra superior: logo + etiqueta */}
      <div className="w-full border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
          {/* Logo intacto */}
          <img src="/LOGO.png" alt="Logo" className="h-9 md:h-11 w-auto" />
          <span className="label">Transcriptor · IA</span>
        </div>
      </div>

      <div className="flex-grow w-full max-w-5xl mx-auto px-6 md:px-10">
        {/* HERO */}
        <header className="pt-16 md:pt-24 pb-12 md:pb-16">
          <p className="label mb-6">La herramienta</p>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] mb-7">
            Tu audio y video,
            <br />
            <Mark>a texto</Mark>.
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 max-w-xl leading-relaxed">
            Sube un archivo (MP4, MOV, MP3, WAV…) y la IA lo transcribe.
            Sin servidores intermedios. 100% privado.
          </p>
        </header>

        {/* API KEY */}
        <section className="pb-10">
          {showKeyInput ? (
            <form onSubmit={saveKey} className="border border-neutral-200 rounded-3xl p-7 md:p-8 max-w-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-zebra rounded-xl flex items-center justify-center text-black shrink-0">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 leading-tight">Configura tu API Key</h3>
                  <p className="label">Requerido para la IA</p>
                </div>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Introduce tu Gemini API Key…"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
                required
              />
              <div className="flex items-center justify-between gap-4 mt-5">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                >
                  Obtener clave gratis <ExternalLink size={12} />
                </a>
                <button
                  type="submit"
                  className="px-7 py-3 bg-neutral-900 text-white rounded-xl text-sm font-extrabold hover:bg-neutral-700 transition-colors active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-4 border border-neutral-200 rounded-2xl px-6 py-4 max-w-xl">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-zebra" />
                <span className="text-sm font-bold text-neutral-900">API Key configurada</span>
              </div>
              <button
                onClick={() => setShowKeyInput(true)}
                className="text-xs font-semibold text-neutral-400 hover:text-neutral-900 transition-colors underline underline-offset-4"
              >
                Cambiar
              </button>
            </div>
          )}
        </section>

        {/* CONTENIDO PRINCIPAL */}
        <main className="pb-24">
          {status === AppStatus.IDLE && (
            <section className="border-2 border-dashed border-neutral-200 rounded-[2.5rem] p-8 md:p-14 hover:border-neutral-300 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*,audio/*"
                className="hidden"
              />

              {!file ? (
                <div className="flex flex-col items-start text-left max-w-xl">
                  <div className="w-14 h-14 bg-zebra rounded-2xl flex items-center justify-center mb-7 text-black">
                    <Upload size={26} />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                    Sube tu <Mark>archivo</Mark>.
                  </h2>
                  <p className="text-neutral-500 mb-8 text-lg">Soporta video (MP4, MOV) y audio (MP3, WAV…).</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-2xl font-extrabold hover:bg-neutral-700 transition-colors active:scale-95"
                  >
                    Elegir archivo <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-6 max-w-xl">
                  <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-200 text-left">
                    <div className="w-12 h-12 bg-zebra rounded-xl flex items-center justify-center shrink-0 text-black">
                      <FileVideo size={24} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold truncate text-neutral-900">{file.name}</p>
                      <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button onClick={reset} className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 transition-colors">
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <button
                    onClick={processFile}
                    disabled={!apiKey}
                    className={`w-full py-4 rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
                      apiKey
                        ? 'bg-zebra text-black hover:brightness-95'
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    {apiKey ? 'Iniciar transcripción' : 'Falta API Key'} <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </section>
          )}

          {(status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING) && (
            <section className="border border-neutral-200 rounded-[2.5rem] p-10 md:p-16">
              <p className="label mb-5">En proceso</p>
              <div className="flex items-center gap-4 mb-8">
                <Loader2 className="animate-spin text-neutral-900" size={36} />
                <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  {status === AppStatus.EXTRACTING_AUDIO ? (
                    <>Extrayendo <Mark>audio</Mark>…</>
                  ) : (
                    <>La IA está <Mark>transcribiendo</Mark>…</>
                  )}
                </h3>
              </div>
              <div className="max-w-md">
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-zebra h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="label">{progress}% completado</p>
              </div>
            </section>
          )}

          {status === AppStatus.ERROR && (
            <section className="border-2 border-red-200 rounded-[2.5rem] p-10 md:p-14 max-w-xl">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-7 text-red-500">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mb-3">Algo salió mal.</h3>
              <p className="text-neutral-500 text-lg mb-8">{error}</p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-2xl font-extrabold hover:bg-neutral-700 transition-colors active:scale-95"
              >
                Reintentar <RefreshCw size={18} />
              </button>
            </section>
          )}

          {status === AppStatus.COMPLETED && result && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <p className="label mb-4">Resultado</p>
                  <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
                    <CheckCircle2 className="text-neutral-900" size={36} />
                    Proceso <Mark>finalizado</Mark>.
                  </h3>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-zebra text-black rounded-xl font-extrabold hover:brightness-95 transition-all active:scale-95"
                  >
                    <Copy size={18} /> {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={reset}
                    className="p-3 bg-neutral-900 hover:bg-neutral-700 text-white rounded-xl transition-colors"
                    aria-label="Nueva transcripción"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>
              <div className="border border-neutral-200 rounded-[2rem] p-8 md:p-10 min-h-[200px]">
                <div className="text-neutral-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {result.text}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="w-full border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 flex items-center justify-between">
          <span className="label">Sin servidores · 100% privado</span>
          <img src="/LOGO.png" alt="Logo" className="h-6 w-auto opacity-40" />
        </div>
      </footer>
    </div>
  );
}
