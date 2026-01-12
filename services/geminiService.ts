import { GoogleGenAI } from "@google/genai";

export async function transcribeAudio(audioBase64: string, apiKey: string): Promise<string> {
  // Inicializamos con la clave proporcionada por el usuario o la de sistema
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
  
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
      temperature: 0.1,
    }
  });

  return response.text || "No se pudo generar la transcripción.";
}
