import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileVideo,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  RefreshCw,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { extractAudioFromVideo } from './services/audioService';
import { transcribeAudio } from './services/geminiService';
import { AppStatus, TranscriptionResult } from './types';

const ALLOWED_DOMAIN = 'zebradigital.marketing';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const USER_STORAGE_KEY = 'ZEBRA_USER';

interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
}

// Decodifica el payload de un JWT (sin verificar firma: es una puerta de UI, no seguridad de servidor)
function decodeJwt(token: string): any {
  const part = token.split('.')[1];
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(json);
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // La API Key siempre viene del entorno (Easy Panel). Como respaldo, localStorage.
  useEffect(() => {
    const envKey = process.env.API_KEY;
    if (envKey) {
      setApiKey(envKey);
      return;
    }
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Restaurar sesión previa
  useEffect(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AuthUser = JSON.parse(saved);
        if (parsed.email && parsed.email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN)) {
          setUser(parsed);
        }
      } catch {
        /* noop */
      }
    }
  }, []);

  const handleCredential = useCallback((response: any) => {
    try {
      const payload = decodeJwt(response.credential);
      const email: string = (payload.email || '').toLowerCase();
      const domainOk =
        email.endsWith('@' + ALLOWED_DOMAIN) || payload.hd === ALLOWED_DOMAIN;

      if (!payload.email_verified || !domainOk) {
        setAuthError(`Acceso restringido a cuentas @${ALLOWED_DOMAIN}.`);
        (window as any).google?.accounts.id.disableAutoSelect();
        return;
      }

      const authed: AuthUser = { email, name: payload.name, picture: payload.picture };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authed));
      setAuthError(null);
      setUser(authed);
    } catch {
      setAuthError('No se pudo validar el inicio de sesión. Intenta de nuevo.');
    }
  }, []);

  // Inicializar el botón de Google cuando no hay sesión
  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID) return;

    let cancelled = false;
    const tryInit = () => {
      const google = (window as any).google;
      if (cancelled) return;
      if (!google?.accounts?.id) {
        setTimeout(tryInit, 200);
        return;
      }
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        hd: ALLOWED_DOMAIN,
        auto_select: false
      });
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 280
        });
      }
    };
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [user, handleCredential]);

  const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    (window as any).google?.accounts.id.disableAutoSelect();
    setUser(null);
    reset();
  };

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

  const processFile = async () => {
    if (!file) return;
    if (!apiKey.trim()) {
      setError("No se encontró una API Key configurada en el entorno.");
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.EXTRACTING_AUDIO);
    setError(null);
    setProgress(15);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev < 90 ? prev + 5 : prev));
    }, 800);

    try {
      const { blob, duration } = await extractAudioFromVideo(file);

      setStatus(AppStatus.TRANSCRIBING);
      const text = await transcribeAudio(blob, duration, apiKey);

      setProgress(100);

      setResult({ text, duration });
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo procesar el vídeo. Verifica que tu API Key sea válida.");
      setStatus(AppStatus.ERROR);
    } finally {
      clearInterval(progressInterval);
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

  // ------- PANTALLA DE LOGIN -------
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-accent selection:text-on-accent">
        <div className="w-full border-b border-line">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-5 flex items-center justify-center">
            <img src="/LOGO.png" alt="Zebra" className="logo h-7 md:h-8 w-auto" />
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md text-center">
            <p className="label mb-6">Acceso privado</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[0.95] mb-4">
              Inicia sesión.
            </h1>
            <p className="text-muted text-lg mb-10 leading-relaxed">
              Solo cuentas <span className="text-fg font-semibold">@{ALLOWED_DOMAIN}</span> pueden usar el transcriptor.
            </p>

            {GOOGLE_CLIENT_ID ? (
              <div className="flex flex-col items-center gap-5">
                <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center" />
                {authError && (
                  <div className="flex items-center gap-2 text-danger text-sm font-semibold">
                    <ShieldAlert strokeWidth={1.5} size={16} /> {authError}
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-line bg-surface rounded-card p-6 text-left">
                <div className="flex items-center gap-2 text-danger font-bold mb-2">
                  <AlertCircle strokeWidth={1.5} size={18} /> Falta configuración
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  No se ha definido <code className="text-fg">GOOGLE_CLIENT_ID</code> en el entorno.
                  Añádelo en Easy Panel y vuelve a desplegar.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="w-full border-t border-line">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 text-center">
            <span className="label">Sin servidores · 100% privado</span>
          </div>
        </footer>
      </div>
    );
  }

  // ------- APP -------
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-accent selection:text-on-accent">
      {/* Franja blanca para el logo negro */}
      <div className="w-full border-b border-line">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between gap-4">
          <span className="hidden sm:block text-xs font-semibold text-muted truncate max-w-[40%]">{user.email}</span>
          <img src="/LOGO.png" alt="Zebra" className="logo h-7 md:h-8 w-auto" />
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted hover:text-fg transition-colors"
          >
            <LogOut strokeWidth={1.5} size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="flex-grow w-full max-w-5xl mx-auto px-6 md:px-10 text-center">
        {/* HERO */}
        <header className="pt-16 md:pt-24 pb-12 md:pb-16">
          <p className="label mb-6">La herramienta</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95] mb-7">
            Tu audio y video,
            <br />
            a texto.
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-xl mx-auto leading-relaxed">
            Sube un archivo (MP4, MOV, MP3, WAV…) y la IA lo transcribe.
            Sin servidores intermedios. 100% privado.
          </p>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="pb-24">
          {status === AppStatus.IDLE && (
            <section className="border border-dashed border-line-strong bg-surface rounded-card p-8 md:p-14 hover:border-muted transition-colors max-w-2xl mx-auto">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*,audio/*"
                className="hidden"
              />

              {!file ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-surface-2 border border-line rounded-card flex items-center justify-center mb-7 text-fg">
                    <Upload strokeWidth={1.5} size={26} />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                    Sube tu archivo.
                  </h2>
                  <p className="text-muted mb-8 text-lg">Soporta video (MP4, MOV) y audio (MP3, WAV…).</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-on-accent rounded-btn font-semibold hover:opacity-90 transition-all active:scale-95"
                  >
                    Elegir archivo <ArrowRight strokeWidth={1.5} size={20} />
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  <div className="flex items-center gap-4 p-5 bg-surface-2 rounded-card border border-line text-left">
                    <div className="w-12 h-12 bg-surface border border-line rounded-btn flex items-center justify-center shrink-0 text-fg">
                      <FileVideo strokeWidth={1.5} size={24} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold truncate text-fg">{file.name}</p>
                      <p className="text-xs text-muted font-semibold uppercase tracking-wider mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button onClick={reset} className="p-2 hover:bg-surface-2 rounded-lg text-muted transition-colors">
                      <RefreshCw strokeWidth={1.5} size={18} />
                    </button>
                  </div>
                  <button
                    onClick={processFile}
                    className="w-full py-4 rounded-btn font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.99] bg-accent text-on-accent hover:opacity-90"
                  >
                    Iniciar transcripción <ArrowRight strokeWidth={1.5} size={20} />
                  </button>
                </div>
              )}
            </section>
          )}

          {(status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING) && (
            <section className="border border-line bg-surface rounded-card p-10 md:p-16 max-w-2xl mx-auto flex flex-col items-center">
              <p className="label mb-5">En proceso</p>
              <div className="flex flex-col items-center gap-4 mb-8">
                <Loader2 className="animate-spin text-fg" strokeWidth={1.5} size={36} />
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  {status === AppStatus.EXTRACTING_AUDIO ? 'Extrayendo audio…' : 'La IA está transcribiendo…'}
                </h3>
              </div>
              <div className="w-full max-w-md">
                <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-accent h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="label">{progress}% completado</p>
              </div>
            </section>
          )}

          {status === AppStatus.ERROR && (
            <section className="border border-line bg-surface rounded-card p-10 md:p-14 max-w-2xl mx-auto flex flex-col items-center">
              <div className="w-14 h-14 bg-surface-2 rounded-card flex items-center justify-center mb-7 text-danger">
                <AlertCircle strokeWidth={1.5} size={26} />
              </div>
              <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg mb-3">Algo salió mal.</h3>
              <p className="text-muted text-lg mb-8">{error}</p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-on-accent rounded-btn font-semibold hover:opacity-90 transition-all active:scale-95"
              >
                Reintentar <RefreshCw strokeWidth={1.5} size={18} />
              </button>
            </section>
          )}

          {status === AppStatus.COMPLETED && result && (
            <section className="space-y-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center">
                  <p className="label mb-4">Resultado</p>
                  <h3 className="text-3xl md:text-5xl font-semibold tracking-tight flex items-center gap-3">
                    <CheckCircle2 className="text-fg" strokeWidth={1.5} size={36} />
                    Proceso finalizado.
                  </h3>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-on-accent rounded-btn font-semibold hover:opacity-90 transition-all active:scale-95"
                  >
                    <Copy strokeWidth={1.5} size={18} /> {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={reset}
                    className="p-3 bg-surface-2 border border-line hover:border-line-strong text-fg rounded-btn transition-colors"
                    aria-label="Nueva transcripción"
                  >
                    <RefreshCw strokeWidth={1.5} size={20} />
                  </button>
                </div>
              </div>
              <div className="border border-line rounded-card p-8 md:p-10 min-h-[200px] bg-surface">
                <div className="text-fg leading-relaxed whitespace-pre-wrap font-medium text-left">
                  {result.text}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="w-full border-t border-line">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 text-center">
          <span className="label">Sin servidores · 100% privado</span>
        </div>
      </footer>
    </div>
  );
}
