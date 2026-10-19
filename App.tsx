import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { extractAudioFromVideo } from './services/audioService';
import { transcribeAudio } from './services/geminiService';
import { toPlainText } from './services/formatService';
import { AppStatus, TranscriptionResult } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import DropZone from './components/DropZone';
import FileItem, { FileItemStatus } from './components/FileItem';
import ResultPanel from './components/ResultPanel';

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
  const [fileDuration, setFileDuration] = useState<number | undefined>();
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

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

  const selectFile = (selected: File) => {
    setFile(selected);
    setFileDuration(undefined);
    setResult(null);
    setError(null);
    setStatus(AppStatus.IDLE);
  };

  const showInvalid = (message: string) => {
    setError(message);
    setStatus(AppStatus.ERROR);
  };

  const processFile = async () => {
    if (!file) return;
    if (!apiKey.trim()) {
      showInvalid('No se encontró una API Key configurada en el entorno.');
      return;
    }

    const startedAt = performance.now();
    setStatus(AppStatus.EXTRACTING_AUDIO);
    setError(null);

    try {
      const { blob, duration } = await extractAudioFromVideo(file);
      setFileDuration(duration);

      setStatus(AppStatus.TRANSCRIBING);
      const segments = await transcribeAudio(blob, duration, apiKey);

      setResult({ segments, text: toPlainText(segments), duration, elapsedMs: performance.now() - startedAt, fileName: file.name });
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo procesar el archivo. Verifica que la API Key sea válida.');
      setStatus(AppStatus.ERROR);
    }
  };

  const reset = () => {
    setFile(null);
    setFileDuration(undefined);
    setResult(null);
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  const busy = status === AppStatus.EXTRACTING_AUDIO || status === AppStatus.TRANSCRIBING;

  const fileStatus: FileItemStatus =
    status === AppStatus.EXTRACTING_AUDIO
      ? 'extracting'
      : status === AppStatus.TRANSCRIBING
        ? 'transcribing'
        : status === AppStatus.COMPLETED
          ? 'done'
          : status === AppStatus.ERROR
            ? 'error'
            : 'ready';

  // ------- PANTALLA DE LOGIN -------
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-accent selection:text-on-accent">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4 pt-28 pb-16">
          <div className="w-full max-w-md rounded-card bg-surface border border-line shadow-card p-8 text-center">
            <p className="label mb-4">Acceso privado</p>
            <h1 className="text-3xl font-semibold tracking-tight mb-3">Inicia sesión</h1>
            <p className="text-muted mb-8 leading-relaxed">
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
              <div className="border border-line bg-surface-2 rounded-control p-5 text-left">
                <div className="flex items-center gap-2 text-danger font-semibold mb-2">
                  <AlertCircle strokeWidth={1.5} size={18} /> Falta configuración
                </div>
                <p className="text-muted text-sm leading-relaxed">
                  No se ha definido <code className="text-fg">GOOGLE_CLIENT_ID</code> en el entorno.
                  Añádelo en Easy Panel y vuelve a desplegar.
                </p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ------- APP -------
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-accent selection:text-on-accent">
      <Header email={user.email} onLogout={logout} />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-12 pt-28 pb-16">
        <div className="max-w-2xl mb-10">
          <p className="label mb-4">La herramienta</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">Transcribir audio y video</h1>
          <p className="text-lg text-muted">Sube un archivo MP4, MOV, MP3 o WAV y obtén el texto listo para copiar o descargar.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <DropZone disabled={busy} onFile={selectFile} onInvalid={showInvalid} />

            {file && (
              <div className="rounded-card bg-surface border border-line shadow-card p-4 flex flex-col gap-3">
                <span className="label">Archivo</span>
                <FileItem file={file} status={fileStatus} duration={fileDuration} onRemove={reset} />
                {status === AppStatus.IDLE && (
                  <button
                    onClick={processFile}
                    className="w-full py-3 rounded-btn font-semibold flex items-center justify-center gap-2 bg-accent text-on-accent hover:opacity-90 transition-opacity active:scale-[0.99]"
                  >
                    Transcribir <ArrowRight strokeWidth={1.5} size={18} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <ResultPanel status={status} result={result} error={error} onRetry={file ? processFile : reset} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
