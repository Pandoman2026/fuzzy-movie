import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MovieInfo } from "./types";

// Initialiserer AI-klienten
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getRandomMovie(excludedTitles: string[] = []): Promise<MovieInfo> {
  const exclusionText = excludedTitles.length > 0 
    ? `\n\nDO NOT choose these movies: ${excludedTitles.join(", ")}.`
    : "";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pick a very famous, visually iconic movie. ${exclusionText} Return the title as it is most commonly known internationally. Provide actor name, director, year, and a short description of one specific iconic scene.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          year: { type: Type.STRING },
          director: { type: Type.STRING },
          actor: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["title", "year", "director", "actor", "description"]
      }
    }
  });

  return JSON.parse(response.text.trim());
}

export async function generateMonsterScene(movie: MovieInfo): Promise<string> {
  const prompt = `A cinematic high-quality film scene from "${movie.title}": ${movie.description}. 
  REPLACING ALL HUMAN CHARACTERS WITH THICK, CHUNKY, EXTREMELY FLUFFY MONSTERS. 
  Style: Like a more rotund, colorful Cookie Monster or Muppet with dense vibrant fur and big googly eyes. 
  They wear the exact costumes from the movie scene. Background must be the accurate movie location. 
  No humans, no text, 8k resolution, cinematic lighting.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: "16:9" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Billedgenerering fejlede");
}