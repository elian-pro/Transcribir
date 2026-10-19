import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { Segment, Summary } from "../types";
import { MODEL, assertComplete, looksFormatted } from "./geminiService";

export const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'Inglés' },
  { code: 'pt', name: 'Portugués' },
  { code: 'fr', name: 'Francés' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

// Segmentos por petición al traducir; mantiene cada respuesta lejos del límite de salida.
const TRANSLATE_CHUNK = 250;

function client(apiKey: string) {
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
}

function parseJson(raw: string | undefined): any {
  try {
    return JSON.parse(raw || '');
  } catch {
    throw new Error('La respuesta de Gemini llegó incompleta o con un formato inesperado. Intenta de nuevo.');
  }
}

/**
 * Traduce el texto de cada segmento y conserva sus tiempos y oradores,
 * así el SRT traducido sigue sincronizado con el video.
 */
export async function translateSegments(segments: Segment[], language: LanguageCode, apiKey: string): Promise<Segment[]> {
  const ai = client(apiKey);
  const target = languageName(language);
  const translated: string[] = [];

  for (let from = 0; from < segments.length; from += TRANSLATE_CHUNK) {
    const chunk = segments.slice(from, from + TRANSLATE_CHUNK);
    const input = chunk.map((s, i) => ({ i, text: s.text }));

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: JSON.stringify(input),
      config: {
        systemInstruction: `Eres un traductor profesional. Recibes una lista JSON de fragmentos de una transcripción, con su índice i y su texto.
Traduce cada texto al ${target} de forma fiel y natural.
Reglas: devuelve exactamente los mismos índices, en el mismo orden y uno por fragmento. No unas ni dividas fragmentos. No agregues, quites ni resumas contenido. Si un texto ya está en ${target}, devuélvelo igual. Mantén [inaudible] tal cual. Solo texto plano, sin HTML ni Markdown.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { i: { type: Type.INTEGER }, text: { type: Type.STRING } },
            required: ['i', 'text'],
            propertyOrdering: ['i', 'text'],
          },
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 65536,
      },
    });

    assertComplete(response, 'la traducción', 'La traducción quedó incompleta porque la transcripción es muy larga. Intenta de nuevo.');

    const data = parseJson(response.text);
    const byIndex = new Map<number, string>();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (Number.isInteger(item?.i) && typeof item?.text === 'string') byIndex.set(item.i, item.text.trim());
      }
    }

    // Si falta un solo fragmento, el SRT quedaría desfasado: mejor fallar con claridad.
    if (byIndex.size !== chunk.length || chunk.some((_, i) => !byIndex.get(i))) {
      throw new Error('La traducción llegó con fragmentos de menos o de más. Intenta de nuevo.');
    }
    chunk.forEach((_, i) => translated.push(byIndex.get(i) as string));
  }

  if (looksFormatted(translated.join(' '))) {
    throw new Error('La traducción llegó con formato inesperado. Intenta de nuevo.');
  }

  return segments.map((s, i) => ({ ...s, text: translated[i] }));
}

/** Resumen breve y puntos clave, siempre en español, a partir de la transcripción. */
export async function summarize(text: string, apiKey: string): Promise<Summary> {
  const ai = client(apiKey);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: text,
    config: {
      systemInstruction: `Recibes la transcripción de un audio o video. Escribe en español:
- summary: un resumen de 2 a 4 frases sobre de qué trata.
- keyPoints: de 3 a 7 puntos clave, cada uno en una sola frase.
Reglas: usa solo información que aparezca en la transcripción, sin inventar datos, cifras ni nombres. Solo texto plano, sin HTML ni Markdown. Si la transcripción es demasiado corta para resumir, haz un resumen de una frase y un solo punto clave.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['summary', 'keyPoints'],
        propertyOrdering: ['summary', 'keyPoints'],
      },
    },
  });

  assertComplete(response, 'el resumen', 'El resumen quedó incompleto. Intenta de nuevo.');

  const data = parseJson(response.text);
  const summary = typeof data?.summary === 'string' ? data.summary.trim() : '';
  const keyPoints: string[] = Array.isArray(data?.keyPoints)
    ? data.keyPoints.filter((p: unknown) => typeof p === 'string' && p.trim()).map((p: string) => p.trim())
    : [];

  if (!summary || looksFormatted([summary, ...keyPoints].join('\n'))) {
    throw new Error('Gemini no devolvió un resumen válido. Intenta de nuevo.');
  }
  return { summary, keyPoints };
}

export function summaryToText(s: Summary): string {
  return `Resumen\n${s.summary}\n\nPuntos clave\n${s.keyPoints.map((p) => `· ${p}`).join('\n')}`;
}
