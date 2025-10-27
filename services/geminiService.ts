
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function summarizeArticleFromUrl(url: string): Promise<string> {
  try {
    const prompt = `Please provide a concise, neutral summary of the key points from the news article at this URL: ${url}. The summary should be suitable for a commuter to listen to, focusing on the main takeaways.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing article:", error);
    throw new Error("Failed to get summary from the article URL.");
  }
}

export async function generateSpeechFromText(text: string): Promise<string | null> {
  try {
    const prompt = `Say in a clear and engaging news-reader voice: ${text}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to convert summary to audio.");
  }
}
