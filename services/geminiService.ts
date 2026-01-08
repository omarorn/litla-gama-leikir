
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
    
    let timeGreeting = isNight ? "Það er niðamyrkur." : "Það er dagur.";
    
    return `${timeGreeting}`;
};

// 1. FAST RESPONSES (Gemini 3 Flash) - FOREMAN PERSONALITY UPDATE
export const getForemanCommentary = async (
  gameType: GameType,
  score: number,
  event: 'start' | 'end' | 'milestone'
): Promise<ForemanResponse> => {
  if (!apiKey) return { message: "Hvað er eiginlega í gangi hérna?", mood: 'thinking' };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = getContext();
  
  // UPDATED PERSONALITY: Dad jokes and unhelpful comments
  const systemInstruction = `Þú ert verkstjóri hjá 'Litlu Gamaleigunni'. 
  Persónuleiki: Þú elskar "pabba-brandara" (dad jokes), orðaleiki og ert oftast frekar óhjálplegur eða kemur með óviðeigandi athugasemdir miðað við aðstæður. 
  Þú ert gamaldags og kvartar oft undan unga fólkinu eða tækninni, eða segir brandara sem enginn hlær að.
  Talaðu alltaf á íslensku.
  Samhengi: ${context}`;

  let prompt = "";
  if (event === 'start') prompt = `Nýr leikur að byrja: ${gameType}. Segðu lélegan brandara eða komdu með óþarfa athugasemd.`;
  else if (event === 'end') prompt = `Leik lokið: ${gameType}, stig: ${score}. Komdu með óhjálplega ráðleggingu eða pabba-brandara um niðurstöðuna.`;
  else prompt = `Spilarinn náði áfanga í ${gameType}. Segðu eitthvað vandræðalegt eða "fyndið".`;

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
            mood: { type: Type.STRING, enum: ['happy', 'neutral', 'excited', 'thinking'] }
          },
          required: ['message', 'mood']
        }
      }
    });
    return JSON.parse(response.text || '{}') as ForemanResponse;
  } catch (e) {
    return { message: "Heyrðu, veistu af hverju kafarar stökkva afturábak úr bátnum? Ef þeir stækku framfyrir sig myndu þeir detta ofan í bátinn!", mood: 'happy' };
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

// 3. TRASH SCANNER (Vision - Gemini 3 Pro)
export const identifyTrashItem = async (base64Image: string): Promise<{ item: string, bin: string, reason: string }> => {
  if (!apiKey) return { item: "Óþekkt", bin: "Almennt", reason: "Engin tenging." };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
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
        systemInstruction: "Þú ert verkstjóri sem elskar pabba-brandara. Svaraðu spurningum en reyndu alltaf að troða inn lélegum brandara.",
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

// 7. IMAGE EDITING (Gemini 3 Pro Image - High Quality)
export const editWorkerImage = async (base64Image: string, promptText: string): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
     const model = "gemini-3-pro-image-preview";
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
            contents: `Þú ert verkstjóri á vinnusvæði sem elskar pabba-brandara. Svaraðu þessari spurningu en endaðu á óviðeigandi brandara: ${question}`,
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
            model: 'gemini-3-pro-image-preview',
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

// 11. LEVEL GENERATOR (Gemini 3 Pro) - UPDATED FOR EXTREME WEATHER
export const generateSandLevel = async (levelIndex: number): Promise<{ name: string, wind: number, speed: number, quota: number, enemyCount: number }> => {
    if (!apiKey) return { name: "Offline Level", wind: 0, speed: 0.5, quota: 500, enemyCount: 1 };
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Generate a game level for an excavator game set in extreme Icelandic weather. 
            Level index: ${levelIndex}.
            
            1. Name: Create a creative, dramatic, or funny Icelandic name describing the weather or location (e.g., 'Rokið á Sandskeiði', 'Fárviðri í Flatey', 'Brjálað Veður í Bláfjöllum', 'Skítviðri á Skaganum').
            2. Wind: Scale 0-20. Level 1 is calm (0-2). Level 5+ is stormy. Level 10+ is hurricane force.
            3. Speed: Container movement speed 0.5 - 4.0.
            4. Quota: Score goal (e.g., 200 * level).
            5. EnemyCount: Number of seagulls (0-15). Higher levels have aggressive flocks.

            Return JSON matching the schema.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        wind: { type: Type.NUMBER },
                        speed: { type: Type.NUMBER },
                        quota: { type: Type.NUMBER },
                        enemyCount: { type: Type.NUMBER }
                    },
                    required: ['name', 'wind', 'speed', 'quota', 'enemyCount']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { 
            name: `Óveður á Stigi ${levelIndex}`, 
            wind: 2 + levelIndex, 
            speed: 0.5 + (levelIndex * 0.2), 
            quota: levelIndex * 300, 
            enemyCount: Math.min(10, 1 + levelIndex) 
        };
    }
};

// 12. RETRO AVATAR GENERATOR (Broforce Style)
export const generateRetroAvatar = async (base64Image: string): Promise<string | null> => {
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const props = [
        "holding a flaming taco",
        "wielding a laser shark",
        "wearing a giant viking helmet",
        "dual-wielding baguettes",
        "riding a tiny dinosaur",
        "with laser eyes",
        "wearing pixelated sunglasses",
        "holding a recycling bin shield",
        "wearing a cape made of caution tape",
        "with a massive pixel beard"
    ];
    
    const randomProp = props[Math.floor(Math.random() * props.length)];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: `Transform this person into a 'Broforce' style 16-bit arcade pixel art action hero. 
                    Style: Retro video game, high contrast, vibrant colors, pixelated edges.
                    Action: The character should be looking heroic and ${randomProp}.
                    Background: Explosions or retro gradient.
                    Keep facial hair/glasses from original if present, but make it look like a badass video game character.` }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
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
        console.error("Avatar generation failed", e);
        return null;
    }
};
