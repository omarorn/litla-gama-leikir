import { GoogleGenAI, Type } from "@google/genai";
import { GameType, ForemanResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to get seasonal context for system instructions
const getContext = () => {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const isNight = hour < 7 || hour >= 20;
    const isWinter = month >= 9 || month <= 3;
    
    let timeGreeting = isNight ? "Það er komið kvöld á vinnusvæðinu." : "Það er bjartur dagur.";
    let seasonContext = isWinter ? "Það er vetur og kalt úti. Minntu á hálkuvarnir." : "Það er sumar og góð vinnuveður.";
    
    return `${timeGreeting} ${seasonContext}`;
};

// 1. FAST RESPONSES (Flash-Lite)
export const getForemanCommentary = async (
  gameType: GameType,
  score: number,
  event: 'start' | 'end' | 'milestone'
): Promise<ForemanResponse> => {
  if (!apiKey) return { message: "Vantar API lykil!", mood: 'neutral' };

  // Use Flash-Lite for low latency UI updates
  const modelId = "gemini-2.5-flash-lite-preview-02-05";
  const context = getContext();
  
  const systemInstruction = `Þú ert verkstjóri hjá 'Litlu Gamaleigunni'. 
  Talaðu stutt og hressilega á íslensku. Hvettu spilarann áfram.
  Samhengi: ${context}`;

  let prompt = "";
  if (event === 'start') prompt = `Nýr leikur: ${gameType}. Kveðja.`;
  else if (event === 'end') prompt = `Leik lokið: ${gameType}, stig: ${score}. Stutt umsögn.`;
  else prompt = `Góður árangur í ${gameType}! Hrósaðu.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            mood: { type: Type.STRING, enum: ['happy', 'neutral', 'excited'] }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}') as ForemanResponse;
  } catch (e) {
    return { message: "Áfram gakk!", mood: 'happy' };
  }
};

// 2. IMAGE EDITING (Flash Image - Nano Banana logic)
export const editWorkerImage = async (base64Image: string, promptText: string): Promise<string | null> => {
  if (!apiKey) return null;
  try {
     const model = "gemini-2.5-flash-image"; // For editing
     const response = await ai.models.generateContent({
       model,
       contents: {
         parts: [
           { inlineData: { mimeType: "image/jpeg", data: base64Image } },
           { text: `Edit this image: ${promptText}. Keep the face recognizable but apply the style strongly.` }
         ]
       }
     });
     
     // Scan all parts for the image
     for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
     }
     return null;
  } catch (e) {
    console.error("Editing failed", e);
    return null;
  }
};

// 3. TRASH SCANNER (Vision - Gemini 3 Pro)
export const identifyTrashItem = async (base64Image: string): Promise<{ item: string, bin: string, reason: string }> => {
  if (!apiKey) return { item: "Óþekkt", bin: "Almennt", reason: "Engin tenging." };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Best for reasoning about images
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Greindu þennan hlut. Hvað er þetta og í hvaða tunnu fer það (Plast, Pappi, Matur, Málmar eða Almennt)? Svaraðu á íslensku JSON. Vertu viss." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            item: { type: Type.STRING },
            bin: { type: Type.STRING },
            reason: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error(e);
    return { item: "Villa", bin: "Almennt", reason: "Gat ekki greint mynd." };
  }
};

// 4. THINKING MODE (Complex Safety Questions)
export const askForemanComplex = async (question: string): Promise<string> => {
  if (!apiKey) return "Enginn lykill.";
  const context = getContext();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: question,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // MAX THINKING
        systemInstruction: `Þú ert öryggisstjóri á vinnusvæði. Hugsaðu djúpt um öryggisreglur og umhverfismál áður en þú svarar á íslensku. Taktu tillit til þess að: ${context}`
      }
    });
    return response.text || "Engin svör.";
  } catch (e) {
    return "Kerfisvilla við hugsun.";
  }
};

// 5. MAPS GROUNDING (Flash 2.5)
export const findPlaces = async (query: string): Promise<{text: string, links: string[]}> => {
  if (!apiKey) return { text: "Vantar lykil.", links: [] };
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find locations in Iceland: ${query}. Svaraðu á íslensku.`,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    // Extract links
    const links: string[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach(c => {
      if (c.web?.uri) links.push(c.web.uri);
    });
    
    return { text: response.text || "Fann ekkert.", links };
  } catch (e) {
    console.error(e);
    return { text: "Villa við leit.", links: [] };
  }
};

// 6. BANANA REWARD (Flash Image)
export const generateBananaReward = async (base64Image: string): Promise<string | null> => {
  if (!apiKey) return null;
  try {
     const model = "gemini-2.5-flash-image";
     const response = await ai.models.generateContent({
       model,
       contents: {
         parts: [
           { inlineData: { mimeType: "image/jpeg", data: base64Image } },
           { text: "Transform this person into a banana character. Funny, cartoon style. Keep the face somewhat recognizable but make them a banana." }
         ]
       }
     });
     
     // Scan all parts for the image
     for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
     }
     return null;
  } catch (e) {
    console.error("Banana generation failed", e);
    return null;
  }
};