
import React, { useState, useRef } from 'react';
import { MessageSquare, Image as ImageIcon, Mic, Send, Loader2, X, Globe, ExternalLink } from 'lucide-react';
import { sendMessageToGemini, generateGameImage, transcribeAudioFromBase64, searchWithGrounding } from '../services/geminiService';

const AIAssistant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [mode, setMode] = useState<'chat' | 'image' | 'audio' | 'search'>('chat');
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, links?: string[] }[]>([]);
    const [loading, setLoading] = useState(false);

    // Image Generation State
    const [imgPrompt, setImgPrompt] = useState("");
    const [imgSize, setImgSize] = useState<"1K" | "2K" | "4K">("1K");
    const [generatedImg, setGeneratedImg] = useState<string | null>(null);

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const handleChat = async () => {
        if (!chatInput.trim() || loading) return;
        const userMsg = chatInput;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput("");
        setLoading(true);
        try {
            if (mode === 'search') {
                const result = await searchWithGrounding(userMsg);
                setMessages(prev => [...prev, { role: 'model', text: result.text, links: result.links }]);
            } else {
                const reply = await sendMessageToGemini(userMsg, []);
                setMessages(prev => [...prev, { role: 'model', text: reply || "Gat ekki svarað." }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Villa kom upp í samskiptum." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imgPrompt.trim() || loading) return;
        setLoading(true);
        const data = await generateGameImage(imgPrompt, imgSize);
        if (data) setGeneratedImg(data);
        setLoading(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    setLoading(true);
                    const text = await transcribeAudioFromBase64(base64);
                    setMessages(prev => [...prev, { role: 'user', text: `[Rödd]: ${text}` }]);
                    setLoading(false);
                    setChatInput(text);
                    setMode('chat');
                };
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (e) {
            alert("Hljóðnemi virkar ekki.");
        }
    };

    const stopRecording = () => {
        mediaRecorder.current?.stop();
        setIsRecording(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px] text-white">
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex gap-4">
                    <button onClick={() => setMode('chat')} className={`p-2 rounded ${mode === 'chat' ? 'bg-blue-600' : 'hover:bg-slate-700'}`} title="Spjall"><MessageSquare size={20} /></button>
                    <button onClick={() => setMode('search')} className={`p-2 rounded ${mode === 'search' ? 'bg-green-600' : 'hover:bg-slate-700'}`} title="Vefleit"><Globe size={20} /></button>
                    <button onClick={() => setMode('image')} className={`p-2 rounded ${mode === 'image' ? 'bg-purple-600' : 'hover:bg-slate-700'}`} title="Myndir"><ImageIcon size={20} /></button>
                    <button onClick={() => setMode('audio')} className={`p-2 rounded ${mode === 'audio' ? 'bg-red-600' : 'hover:bg-slate-700'}`} title="Tal"><Mic size={20} /></button>
                </div>
                <button onClick={onBack} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {(mode === 'chat' || mode === 'search') && (
                    <>
                        {messages.length === 0 && (
                            <div className="text-center text-slate-500 mt-20">
                                {mode === 'search' ? <Globe size={48} className="mx-auto mb-4 opacity-20" /> : <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />}
                                <p>{mode === 'search' ? "Leitaðu á netinu með Gemini 3 Grounding." : "Spyrðu Gemini Pro um hvað sem er."}</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl ${m.role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none border border-slate-700'}`}>
                                    <p className="text-sm">{m.text}</p>
                                    {m.links && m.links.length > 0 && (
                                        <div className="mt-3 space-y-1 pt-3 border-t border-slate-600/50">
                                            {m.links.map((link, l) => (
                                                <a key={l} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-green-400 hover:underline bg-slate-900/50 p-1.5 rounded truncate">
                                                    <ExternalLink size={10} /> {link}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="flex justify-start"><Loader2 className="animate-spin text-slate-500" /></div>}
                    </>
                )}

                {mode === 'image' && (
                    <div className="flex flex-col items-center space-y-6">
                        <div className="w-full aspect-square bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                            {generatedImg ? (
                                <img src={`data:image/png;base64,${generatedImg}`} className="w-full h-full object-cover" />
                            ) : loading ? (
                                <div className="text-center">
                                    <Loader2 className="animate-spin text-purple-500 mx-auto mb-2" size={48} />
                                    <p className="text-sm text-purple-400 animate-pulse uppercase font-black">Teikna...</p>
                                </div>
                            ) : (
                                <div className="text-center opacity-20">
                                    <ImageIcon size={64} className="mx-auto mb-2" />
                                    <p>Búðu til mynd með Gemini 3 Pro Image</p>
                                </div>
                            )}
                        </div>
                        <div className="w-full space-y-3">
                            <div className="flex gap-2 justify-center">
                                {(["1K", "2K", "4K"] as const).map(s => (
                                    <button key={s} onClick={() => setImgSize(s)} className={`px-4 py-1 rounded text-xs font-bold ${imgSize === s ? 'bg-purple-600' : 'bg-slate-800'}`}>{s}</button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-purple-500"
                                    placeholder="Lýstu myndinni... t.d. 'Gámur í geimnum'"
                                    value={imgPrompt}
                                    onChange={(e) => setImgPrompt(e.target.value)}
                                />
                                <button onClick={handleGenerateImage} disabled={loading} className="bg-purple-600 p-4 rounded-xl hover:bg-purple-500 transition-colors">
                                    <ImageIcon size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'audio' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-8">
                        <div className={`p-10 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-800'} transition-all`}>
                            <Mic size={64} className={isRecording ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-2">{isRecording ? "Hlusta..." : "Raddgreining"}</h3>
                            <p className="text-slate-500 text-sm max-w-xs">Smelltu til að tala. Gemini 3 Flash breytir tali í texta.</p>
                        </div>
                        <button 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`px-10 py-4 rounded-full font-black uppercase tracking-widest ${isRecording ? 'bg-slate-700' : 'bg-red-600 hover:bg-red-500'} transition-colors`}
                        >
                            {isRecording ? "Stoppa" : "Byrja að tala"}
                        </button>
                    </div>
                )}
            </div>

            {(mode === 'chat' || mode === 'search') && (
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input 
                        className="flex-1 bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500"
                        placeholder={mode === 'search' ? "Leitaðu á vefnum..." : "Skrifaðu skilaboð..."}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                    />
                    <button onClick={handleChat} disabled={loading} className={`${mode === 'search' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'} p-3 rounded-xl transition-colors`}>
                        {mode === 'search' ? <Globe size={20} /> : <Send size={20} />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AIAssistant;
