
import { GoogleGenAI, Type } from "@google/genai";
import { GameType, ForemanResponse } from "../types";

const apiKey = process.env.API_KEY || '';

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

// 1. FAST RESPONSES (Gemini 3 Flash)
export const getForemanCommentary = async (
  gameType: GameType,
  score: number,
  event: 'start' | 'end' | 'milestone'
): Promise<ForemanResponse> => {
  if (!apiKey) return { message: "Vantar API lykil!", mood: 'neutral' };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            mood: { type: Type.STRING, enum: ['happy', 'neutral', 'excited'] }
          },
          required: ['message', 'mood']
        }
      }
    });
    return JSON.parse(response.text || '{}') as ForemanResponse;
  } catch (e) {
    return { message: "Áfram gakk!", mood: 'happy' };
  }
};

// 2. IMAGE GENERATION (Gemini 3 Pro Image)
export const generateGameImage = async (prompt: string, size: "1K" | "2K" | "4K" = "1K"): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
};

// 3. TRASH SCANNER (Vision - Gemini 3 Flash)
export const identifyTrashItem = async (base64Image: string): Promise<{ item: string, bin: string, reason: string }> => {
  if (!apiKey) return { item: "Óþekkt", bin: "Almennt", reason: "Engin tenging." };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Greindu þennan hlut. Hvað er þetta og í hvaða tunnu fer það (Plast, Pappi, Matur, Málmar eða Almennt)? Svaraðu á íslensku JSON." }
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
          },
          required: ['item', 'bin', 'reason']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Vision error:", e);
    return { item: "Villa", bin: "Almennt", reason: "Gat ekki greint mynd. Athugaðu tengingu eða módel." };
  }
};

// 4. CHAT (Gemini 3 Pro)
export const sendMessageToGemini = async (message: string, history: { role: string, parts: any[] }[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
        systemInstruction: "Þú ert hjálpsamur starfsmaður hjá Litlu Gamaleigunni. Þú svarar spurningum um flokkun, snjómokstur og vinnuvélar á íslensku.",
    }
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};

// 5. SEARCH GROUNDING (Gemini 3 Flash)
export const searchWithGrounding = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web?.uri).filter(Boolean) || [];
  return { text: response.text, links };
};

// 6. AUDIO TRANSCRIPTION (Gemini 3 Flash)
export const transcribeAudioFromBase64 = async (base64Audio: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
                    { text: "Transcribe this audio exactly in Icelandic." }
                ]
            }
        });
        return response.text || "Enginn texti fannst.";
    } catch (e) {
        console.error(e);
        return "Gat ekki afritað hljóð.";
    }
};

// 7. IMAGE EDITING (Gemini 2.5 Flash Image - Standard for Editing)
export const editWorkerImage = async (base64Image: string, promptText: string): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
     const model = "gemini-2.5-flash-image";
     const response = await ai.models.generateContent({
       model,
       contents: {
         parts: [
           { inlineData: { mimeType: "image/jpeg", data: base64Image } },
           { text: `Edit this image: ${promptText}. Keep the face recognizable but apply the style strongly.` }
         ]
       }
     });
     for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) return part.inlineData.data;
     }
     return null;
  } catch (e) { return null; }
};

// 8. MAPS GROUNDING (Gemini 2.5 Flash - Maps only supported here)
export const findPlaces = async (query: string): Promise<{text: string, links: string[]}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find locations in Iceland: ${query}`,
      config: { tools: [{ googleMaps: {} }] }
    });
    const links: string[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach(c => {
      if (c.maps?.uri) links.push(c.maps.uri);
      if (c.web?.uri) links.push(c.web.uri);
    });
    return { text: response.text || "", links };
  } catch (e) { return { text: "Villa.", links: [] }; }
};

// 9. COMPLEX QUESTION (Gemini 3 Pro)
export const askForemanComplex = async (question: string): Promise<string> => {
    if (!apiKey) return "Vantar API lykil.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Þú ert verkstjóri á vinnusvæði. Svaraðu þessari spurningu stuttlega og hressilega á íslensku: ${question}`,
            config: {
                thinkingConfig: { thinkingBudget: 2048 }
            }
        });
        return response.text || "Engin svör.";
    } catch (e) {
        console.error(e);
        return "Gat ekki svarað akkúrat núna.";
    }
};

// 10. BANANA REWARD (Gemini 2.5 Flash Image)
export const generateBananaReward = async (base64Image: string): Promise<string | null> => {
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Transform the person in this image into a hilarious yellow banana-human hybrid character wearing a high-vis construction vest and helmet. Keep the facial expression. Make it fun and cartoony." }
                ]
            }
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (e) {
        console.error("Banana generation failed", e);
        return null;
    }
};
