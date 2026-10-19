import { useCallback, useEffect, useRef, useState } from 'react';
import { QueueItem } from '../types';
import { extractAudioFromVideo } from '../services/audioService';
import { transcribeAudio } from '../services/geminiService';
import { toPlainText } from '../services/formatService';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Cola de archivos que se procesan EN SERIE, uno por uno: cada audio se decodifica
 * completo en memoria, así que procesar varios a la vez podría agotar el navegador.
 */
export function useQueue(apiKey: string) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const update = (id: string, patch: Partial<QueueItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const run = async (item: QueueItem) => {
    if (!apiKey.trim()) {
      update(item.id, { status: 'error', error: 'No se encontró una API Key configurada en el entorno.' });
      return;
    }

    const startedAt = performance.now();
    update(item.id, { status: 'extracting', error: undefined });

    try {
      const { blob, duration } = await extractAudioFromVideo(item.file);
      update(item.id, { status: 'transcribing', duration });

      const segments = await transcribeAudio(blob, duration, apiKey);
      update(item.id, {
        status: 'done',
        result: {
          segments,
          text: toPlainText(segments),
          duration,
          elapsedMs: performance.now() - startedAt,
          fileName: item.file.name,
        },
      });
    } catch (err: any) {
      console.error(err);
      update(item.id, {
        status: 'error',
        error: err.message || 'No se pudo procesar el archivo. Verifica que la API Key sea válida.',
      });
    }
  };

  // Toma el siguiente archivo en cola cuando no hay otro en proceso.
  useEffect(() => {
    if (busyRef.current) return;
    const next = items.find((i) => i.status === 'queued');
    if (!next) return;
    busyRef.current = true;
    run(next).finally(() => {
      busyRef.current = false;
      setItems((prev) => [...prev]); // vuelve a evaluar la cola
    });
  }, [items]);

  const add = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const created = files.map((file) => ({ id: newId(), file, status: 'queued' as const }));
    setItems((prev) => [...prev, ...created]);
    setSelectedId((cur) => cur ?? created[0].id);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const rest = prev.filter((i) => i.id !== id);
      setSelectedId((cur) => (cur === id ? rest[0]?.id ?? null : cur));
      return rest;
    });
  }, []);

  const retry = useCallback((id: string) => {
    update(id, { status: 'queued', error: undefined, result: undefined });
  }, []);

  /** Quita los archivos terminados (completados o con error); deja los pendientes. */
  const clearFinished = useCallback(() => {
    setItems((prev) => {
      const rest = prev.filter((i) => i.status !== 'done' && i.status !== 'error');
      setSelectedId((cur) => (rest.some((i) => i.id === cur) ? cur : rest[0]?.id ?? null));
      return rest;
    });
  }, []);

  /** Vacía la cola completa (al cerrar sesión). */
  const reset = useCallback(() => {
    setItems([]);
    setSelectedId(null);
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return { items, selected, select: setSelectedId, add, remove, retry, clearFinished, reset };
}
