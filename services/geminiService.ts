import { GoogleGenAI, FinishReason, ThinkingLevel, Type, createUserContent, createPartFromUri } from "@google/genai";
import { Segment } from "../types";
import { parseTimestamp } from "./formatService";

// Gemini limita cada petición con datos "inline" a ~20 MB en total. El base64 infla
// el audio un 33%, así que por encima de ~14 MB de WAV hay que usar la Files API.
const INLINE_LIMIT_BYTES = 14 * 1024 * 1024; // 14 MB

const MODEL = 'gemini-3-flash-preview';

// Ritmo de habla muy rápido (~250 palabras/min) más margen. Si el texto supera este
// ritmo para la duración del audio, el modelo casi seguro inventó contenido.
const MAX_WORDS_PER_MINUTE = 320;

const SYSTEM_INSTRUCTION = `Eres un transcriptor profesional. Tu única tarea es convertir a texto el audio que recibes, con sus marcas de tiempo.

Reglas obligatorias:
1. Transcribe de forma literal y completa lo que se dice, en el idioma original del audio. No traduzcas, no resumas, no corrijas el contenido y no agregues comentarios.
2. Nunca inventes contenido. Si una parte no se entiende, escribe [inaudible] en ese punto.
3. Si en el audio no hay voz humana (solo silencio, música o ruido), devuelve noSpeech en true y segments vacío.
4. Divide la transcripción en segmentos cortos aptos para subtítulos: una o dos frases, de máximo 12 segundos cada uno, en orden cronológico y sin huecos de texto.
5. start y end son el inicio y el fin del segmento en formato MM:SS (o HH:MM:SS si el audio pasa de una hora), medidos desde el inicio del audio.
6. speaker identifica la voz: "Orador 1", "Orador 2", etc. Si solo habla una persona, usa siempre "Orador 1".
7. text es texto plano. Prohibido usar HTML, Markdown, títulos, listas o viñetas.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    noSpeech: { type: Type.BOOLEAN },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.STRING },
          end: { type: Type.STRING },
          speaker: { type: Type.STRING },
          text: { type: Type.STRING },
        },
        required: ['start', 'end', 'speaker', 'text'],
        propertyOrdering: ['start', 'end', 'speaker', 'text'],
      },
    },
  },
  required: ['noSpeech', 'segments'],
  propertyOrdering: ['noSpeech', 'segments'],
};

const USER_PROMPT = 'Transcribe este audio siguiendo las reglas.';

const HTML_TAG_RE = /<\/?(p|h[1-6]|ol|ul|li|div|span|br|strong|em|article|section)\b[^>]*>/i;
const MARKDOWN_RE = /(^#{1,6}\s)|(\*\*[^*\n]+\*\*)|(^```)/m;

export async function transcribeAudio(audioBlob: Blob, duration: number, apiKey: string): Promise<Segment[]> {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

  let contents: any;

  if (audioBlob.size <= INLINE_LIMIT_BYTES) {
    // Archivo pequeño: lo enviamos incrustado (más rápido, una sola petición).
    const base64 = await blobToBase64(audioBlob);
    contents = createUserContent([
      { inlineData: { mimeType: 'audio/wav', data: base64 } },
      USER_PROMPT,
    ]);
  } else {
    // Archivo grande: lo subimos por la Files API (soporta hasta ~2 GB).
    let uploaded = await ai.files.upload({
      file: audioBlob,
      config: { mimeType: 'audio/wav' },
    });

    // La Files API procesa el audio de forma asíncrona: esperamos a que esté listo.
    while (uploaded.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      uploaded = await ai.files.get({ name: uploaded.name as string });
    }

    if (uploaded.state === 'FAILED') {
      throw new Error('El servidor no pudo procesar el audio. Intenta de nuevo con un archivo más corto.');
    }

    contents = createUserContent([
      createPartFromUri(uploaded.uri as string, uploaded.mimeType as string),
      USER_PROMPT,
    ]);
  }

  // Sin temperature: los modelos Gemini 3 están pensados para su valor por defecto,
  // y bajarlo puede provocar bucles o respuestas inventadas.
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      // Transcribir no requiere razonar mucho; así queda más espacio para el texto.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      maxOutputTokens: 65536,
    },
  });

  if (response.promptFeedback?.blockReason) {
    throw new Error('Gemini bloqueó el archivo y no lo transcribió. Prueba con otro archivo.');
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === FinishReason.MAX_TOKENS) {
    throw new Error('La transcripción quedó incompleta porque el audio es demasiado largo. Divide el archivo en partes más cortas.');
  }
  if (finishReason && finishReason !== FinishReason.STOP) {
    throw new Error(`Gemini detuvo la transcripción antes de terminar (${finishReason}). Intenta de nuevo.`);
  }

  return parseAndValidate(response.text || '', duration);
}

/**
 * Convierte la respuesta JSON en segmentos y revisa que parezca una transcripción real
 * y no contenido inventado. Lanza un error con un mensaje claro si algo no cuadra.
 */
function parseAndValidate(raw: string, duration: number): Segment[] {
  if (!raw.trim()) {
    throw new Error('Gemini no devolvió ningún texto. Intenta de nuevo.');
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('La respuesta de Gemini llegó incompleta o con un formato inesperado. Intenta de nuevo.');
  }

  const rawSegments: any[] = Array.isArray(data?.segments) ? data.segments : [];
  if (data?.noSpeech === true || rawSegments.length === 0) {
    throw new Error('No se detectó voz en el archivo. Revisa que el audio tenga a alguien hablando.');
  }

  const segments: Segment[] = rawSegments
    .map((s) => ({
      start: parseTimestamp(s?.start),
      end: parseTimestamp(s?.end),
      speaker: String(s?.speaker || 'Orador 1').trim(),
      text: String(s?.text || '').replace(/\s+/g, ' ').trim(),
    }))
    .filter((s) => s.text && !isNaN(s.start))
    .sort((a, b) => a.start - b.start);

  if (segments.length === 0) {
    throw new Error('La respuesta de Gemini no trae segmentos válidos. Intenta de nuevo.');
  }

  const fullText = segments.map((s) => s.text).join(' ');

  if (HTML_TAG_RE.test(fullText) || MARKDOWN_RE.test(fullText)) {
    throw new Error('La respuesta no parece una transcripción (llegó con formato de artículo). Intenta de nuevo; si se repite, el audio puede no tener voz clara.');
  }

  const words = fullText.split(/\s+/).filter(Boolean).length;
  const maxWords = Math.ceil((duration / 60) * MAX_WORDS_PER_MINUTE) + 50;
  if (duration > 0 && words > maxWords) {
    throw new Error('La respuesta tiene mucho más texto del que cabe en la duración del audio, así que probablemente no es una transcripción real. Intenta de nuevo.');
  }

  // Tiempos fuera de la duración real son otra señal de contenido inventado.
  const tolerance = Math.max(10, duration * 0.05);
  if (duration > 0 && segments[segments.length - 1].start > duration + tolerance) {
    throw new Error('Las marcas de tiempo no coinciden con la duración del audio, así que la transcripción no es confiable. Intenta de nuevo.');
  }

  // Ajustes menores: fin faltante o antes del inicio, y nada más allá del final del audio.
  return segments.map((seg, i) => {
    const next = segments[i + 1];
    const limit = duration > 0 ? duration : Infinity;
    let end = seg.end;
    if (isNaN(end) || end <= seg.start) end = next ? next.start : seg.start + 3;
    return { ...seg, start: Math.min(seg.start, limit), end: Math.min(Math.max(end, seg.start), limit) };
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the prefix (e.g., "data:audio/wav;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
