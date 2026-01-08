
import { GoogleGenAI } from "@google/genai";

export async function transcribeAudio(audioBase64: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'audio/wav',
            data: audioBase64,
          },
        },
        {
          text: "Transcripción detallada de este audio. Por favor, detecta el idioma automáticamente y devuelve solo el texto transcrito. Si hay varios hablantes, intenta separarlos por etiquetas como [Speaker 1]: ... [Speaker 2]: ...",
        },
      ],
    },
    config: {
      temperature: 0.1, // Lower temperature for more accurate transcription
    }
  });

  return response.text || "No se pudo generar la transcripción.";
}
