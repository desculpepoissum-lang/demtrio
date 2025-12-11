import { GoogleGenAI, Type } from "@google/genai";
import { WordData, Language } from "../types";

// Fallback words in case API fails or key is missing
const FALLBACK_WORDS_EN: WordData[] = [
  { word: "CODE", hint: "Instructions for a computer" },
  { word: "REACT", hint: "A JavaScript library for UIs" },
  { word: "MAZE", hint: "A complex network of paths" },
  { word: "LOGIC", hint: "Reasoning conducted via validation" },
  { word: "PIXEL", hint: "Tiny dot on a screen" },
  { word: "ALGO", hint: "Short for algorithm" },
  { word: "DATA", hint: "Facts and statistics" },
  { word: "NODE", hint: "A point in a network" },
  { word: "LOOP", hint: "Repeating sequence" },
  { word: "STACK", hint: "LIFO data structure" },
];

const FALLBACK_WORDS_PT: WordData[] = [
  { word: "CODIGO", hint: "Instruções para um computador" },
  { word: "REACT", hint: "Uma biblioteca JavaScript para UIs" },
  { word: "LABIRINTO", hint: "Uma rede complexa de caminhos" },
  { word: "LOGICA", hint: "Raciocínio conduzido via validação" },
  { word: "PIXEL", hint: "Ponto minúsculo em uma tela" },
  { word: "DADOS", hint: "Fatos e estatísticas" },
  { word: "REDE", hint: "Conexão de computadores" },
  { word: "LOOP", hint: "Sequência de repetição" },
  { word: "PILHA", hint: "Estrutura de dados LIFO" },
  { word: "NUVEM", hint: "Computação remota" },
];

export const fetchWordForLevel = async (level: number, language: Language): Promise<WordData> => {
  const apiKey = process.env.API_KEY;

  const fallbacks = language === 'pt' ? FALLBACK_WORDS_PT : FALLBACK_WORDS_EN;

  // Always pick a random fallback if API fails
  const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  if (!apiKey) {
    console.warn("No API_KEY found, using fallback words.");
    return randomFallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Determine length based on level (min 5, max 8)
    const length = Math.min(5 + Math.floor(level / 2), 8);
    
    // Add random seed to prompt to ensure variety for the same level
    const seed = Math.floor(Math.random() * 100000);

    const langName = language === 'pt' ? 'Portuguese' : 'English';
    const context = language === 'pt' 
      ? `Gere uma palavra aleatória em Português (sem acentos se possível) com exatamente ${length} letras e uma dica curta. Seed: ${seed}.` 
      : `Generate a random single English word with exactly ${length} letters and a short, cryptic hint. Seed: ${seed}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${context} The word should be common enough for a general audience. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING, description: "The target word (uppercase)" },
            hint: { type: Type.STRING, description: "A short hint describing the word" }
          },
          required: ["word", "hint"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as WordData;
      return {
        word: data.word.toUpperCase(),
        hint: data.hint
      };
    }
    
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Gemini API Error:", error);
    return randomFallback;
  }
};