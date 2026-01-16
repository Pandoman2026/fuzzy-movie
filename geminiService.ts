import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MovieInfo } from "./types";
import localforage from "localforage";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

localforage.config({
  name: 'FuzzyMovieQuiz',
  storeName: 'image_cache'
});

export async function getRandomMovie(excludedTitles: string[] = []): Promise<MovieInfo> {
  const exclusionText = excludedTitles.length > 0 
    ? `\n\nIMPORTANT: You ABSOLUTELY MUST NOT choose any of the following movies: ${excludedTitles.join(", ")}.`
    : "";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Give me a random, very famous movie title and its info. Use the most well-known international title. ${exclusionText} Pick a movie that is visually iconic. Ensure the response is in English.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          year: { type: Type.STRING },
          director: { type: Type.STRING },
          actor: { type: Type.STRING },
          description: { type: Type.STRING, description: "A short English description of an iconic scene" }
        },
        required: ["title", "year", "director", "actor", "description"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text.trim());
    if (excludedTitles.map(t => t.toLowerCase()).includes(data.title.toLowerCase())) {
       if (excludedTitles.length < 50) {
         return getRandomMovie(excludedTitles);
       }
    }
    return data;
  } catch (e) {
    console.error("Failed to parse movie info", e);
    return {
      title: "The Matrix",
      year: "1999",
      director: "Lana & Lilly Wachowski",
      actor: "Keanu Reeves",
      description: "Neo dodges bullets on a rooftop in slow motion."
    };
  }
}

export async function generateMonsterScene(movie: MovieInfo): Promise<string> {
  const cacheKey = `img_${movie.title.toLowerCase().replace(/\s+/g, '_')}`;
  
  const cachedImage = await localforage.getItem<string>(cacheKey);
  if (cachedImage) {
    return cachedImage;
  }

  const prompt = `A cinematic high-quality movie scene from the film "${movie.title}" specifically depicting: ${movie.description}. 
  CRITICAL TWIST: All human actors are replaced by thick, fluffy, colorful fuzzy monsters with big expressive eyes. 
  The creatures are extremely chunky, cute, and covered in thick, vibrant fur. 
  They are wearing the exact costumes from the scene and are in the same iconic poses. 
  Hyper-realistic fur texture, cinematic lighting, 8k resolution, vibrant colors, fun and whimsical atmosphere. 
  No text in the image. No humans. Only chunky fuzzy monsters.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64Data = `data:image/png;base64,${part.inlineData.data}`;
      await localforage.setItem(cacheKey, base64Data);
      return base64Data;
    }
  }

  throw new Error("No image generated");
}