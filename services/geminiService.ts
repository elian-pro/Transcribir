import { GoogleGenAI, FinishReason, createUserContent, createPartFromUri } from "@google/genai";

// Gemini limita cada petición con datos "inline" a ~20 MB en total. El base64 infla
// el audio un 33%, así que por encima de ~14 MB de WAV hay que usar la Files API.
const INLINE_LIMIT_BYTES = 14 * 1024 * 1024; // 14 MB

const MODEL = 'gemini-3-flash-preview';

// Marcador que el modelo debe devolver cuando no hay voz que transcribir.
const NO_SPEECH_MARKER = '[SIN VOZ DETECTABLE]';

// Ritmo de habla muy rápido (~250 palabras/min) más margen. Si el texto supera este
// ritmo para la duración del audio, el modelo casi seguro inventó contenido.
const MAX_WORDS_PER_MINUTE = 320;

const SYSTEM_INSTRUCTION = `Eres un transcriptor profesional. Tu única tarea es convertir a texto el audio que recibes.

Reglas obligatorias:
1. Transcribe de forma literal y completa lo que se dice, en el idioma original del audio. No traduzcas, no resumas, no corrijas el contenido y no agregues comentarios.
2. Nunca inventes contenido. Si una parte no se entiende, escribe [inaudible] en ese punto.
3. Si en el audio no hay voz humana (solo silencio, música o ruido), responde exactamente: ${NO_SPEECH_MARKER}
4. Devuelve solo texto plano. Prohibido usar HTML, Markdown, títulos, listas o viñetas.
5. Si hay más de una voz, empieza cada intervención en una línea nueva con la etiqueta [Orador 1]:, [Orador 2]:, etc. Si solo habla una persona, no uses etiquetas.
6. Separa en párrafos cuando haya pausas o cambios de tema.`;

const USER_PROMPT = 'Transcribe este audio siguiendo las reglas.';

const HTML_TAG_RE = /<\/?(p|h[1-6]|ol|ul|li|div|span|br|strong|em|article|section)\b[^>]*>/i;
const MARKDOWN_RE = /(^#{1,6}\s)|(\*\*[^*\n]+\*\*)|(^```)/m;

export async function transcribeAudio(audioBlob: Blob, duration: number, apiKey: string): Promise<string> {
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
    config: { systemInstruction: SYSTEM_INSTRUCTION },
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

  return validateTranscript(response.text || '', duration);
}

/**
 * Revisa que el texto parezca una transcripción real y no contenido inventado.
 * Lanza un error con un mensaje claro si algo no cuadra.
 */
function validateTranscript(raw: string, duration: number): string {
  const text = raw.trim();

  if (!text) {
    throw new Error('Gemini no devolvió ningún texto. Intenta de nuevo.');
  }

  if (text.includes(NO_SPEECH_MARKER)) {
    throw new Error('No se detectó voz en el archivo. Revisa que el audio tenga a alguien hablando.');
  }

  if (HTML_TAG_RE.test(text) || MARKDOWN_RE.test(text)) {
    throw new Error('La respuesta no parece una transcripción (llegó con formato de artículo). Intenta de nuevo; si se repite, el audio puede no tener voz clara.');
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const maxWords = Math.ceil((duration / 60) * MAX_WORDS_PER_MINUTE) + 50;
  if (duration > 0 && words > maxWords) {
    throw new Error('La respuesta tiene mucho más texto del que cabe en la duración del audio, así que probablemente no es una transcripción real. Intenta de nuevo.');
  }

  return text;
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
