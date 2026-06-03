import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

// Gemini limita las peticiones con datos "inline" (base64 incrustado) a ~20 MB.
// Por encima de eso hay que usar la Files API. Dejamos un margen de seguridad.
const INLINE_LIMIT_BYTES = 18 * 1024 * 1024; // 18 MB

const PROMPT =
  "Transcripción detallada de este audio. Por favor, detecta el idioma automáticamente y devuelve solo el texto transcrito. Si hay varios hablantes, intenta separarlos por etiquetas como [Speaker 1]: ... [Speaker 2]: ...";

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  // Inicializamos con la clave proporcionada por el usuario o la de sistema
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

  let contents: any;

  if (audioBlob.size <= INLINE_LIMIT_BYTES) {
    // Archivo pequeño: lo enviamos incrustado (más rápido, una sola petición).
    const base64 = await blobToBase64(audioBlob);
    contents = {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: base64 } },
        { text: PROMPT },
      ],
    };
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
      PROMPT,
    ]);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: {
      temperature: 0.1,
    },
  });

  return response.text || "No se pudo generar la transcripción.";
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
