import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, ShieldAlert, X } from 'lucide-react';
import { AppStatus, QueueStatus } from './types';
import { useQueue } from './hooks/useQueue';
import Header from './components/Header';
import Footer from './components/Footer';
import DropZone from './components/DropZone';
import FileQueue from './components/FileQueue';
import ResultPanel from './components/ResultPanel';

const STATUS_FOR_PANEL: Record<QueueStatus, AppStatus> = {
  queued: AppStatus.QUEUED,
  extracting: AppStatus.EXTRACTING_AUDIO,
  transcribing: AppStatus.TRANSCRIBING,
  done: AppStatus.COMPLETED,
  error: AppStatus.ERROR,
};

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

  const [apiKey, setApiKey] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const queue = useQueue(apiKey);

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
    queue.reset();
    setNotice(null);
  };

  const selected = queue.selected;

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

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-12 pt-24 pb-16">
        <div className="max-w-3xl mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1.5">Transcribir audio y video</h1>
          <p className="text-base text-muted">Sube uno o varios archivos MP4, MOV, MP3 o WAV y obtén el texto listo para copiar o descargar.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <DropZone
              onFiles={queue.add}
              onInvalid={setNotice}
            />

            {notice && (
              <div role="alert" className="rounded-card bg-surface border border-line p-4 flex items-start gap-3 text-sm">
                <AlertCircle strokeWidth={1.5} size={18} className="text-danger shrink-0 mt-0.5" />
                <p className="flex-1 text-muted">{notice}</p>
                <button onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-muted hover:text-fg">
                  <X strokeWidth={1.5} size={16} />
                </button>
              </div>
            )}

            {queue.items.length > 0 && (
              <FileQueue
                items={queue.items}
                selectedId={selected?.id ?? null}
                onSelect={queue.select}
                onRemove={queue.remove}
                onRetry={queue.retry}
                onClear={queue.clearFinished}
              />
            )}
          </div>

          <div className="lg:col-span-7">
            <ResultPanel
              // key: cada archivo abre el panel con su propio estado (pestaña, idioma, errores).
              key={selected?.id ?? 'none'}
              onTranslate={(language) => (selected ? queue.translate(selected, language) : Promise.resolve())}
              onSummarize={() => (selected ? queue.summarize(selected) : Promise.resolve())}
              status={selected ? STATUS_FOR_PANEL[selected.status] : AppStatus.IDLE}
              result={selected?.result ?? null}
              error={selected?.error ?? null}
              onRetry={() => selected && queue.retry(selected.id)}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
