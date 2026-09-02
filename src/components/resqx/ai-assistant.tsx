"use client";
// ResQ AI Assistant — floating chat with voice input (multilingual) + TTS readout
import React, { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { useResQX, useSpeech } from "./store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_EN = ["Which villages need relocation first?", "What schemes can flood-affected families get?", "Explain today's alerts"];
const QUICK_HI = ["सबसे पहले किन गांवों को पुनर्वास चाहिए?", "बाढ़ प्रभावित परिवारों को क्या योजनाएं मिलेंगी?", "आज की चेतावनियां बताएं"];
const QUICK_MR = ["सर्वात आधी कोणत्या गावांना पुनर्वसन हवं?", "पूरग्रस्त कुटुंबांना कोणत्या योजना मिळतील?", "आजचे इशारे सांगा"];

export function AiAssistant() {
  const { view, data } = useResQX();
  const { lang, t, voiceCode } = useI18n();
  const { speak, stop, listen } = useSpeech();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quick = lang === "hi" ? QUICK_HI : lang === "mr" ? QUICK_MR : QUICK_EN;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });
      const json = await res.json();
      const reply: string = json.reply ?? "Service temporarily unavailable. Please try again.";
      setMessages([...next, { role: "assistant", content: reply }]);
      if (ttsOn) speak(reply, voiceCode);
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection error — please retry." }]);
    } finally {
      setBusy(false);
    }
  };

  const mic = () => {
    if (listening) return;
    const ok = listen(voiceCode, (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)), () => setListening(false));
    if (!ok) {
      setInput("");
      setMessages((m) => [...m, { role: "assistant", content: "Voice input is not supported in this browser — please type your question." }]);
      return;
    }
    setListening(true);
  };

  const alertCount = data?.alerts.filter((a) => a.active).length ?? 0;

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 18 }}
        onClick={() => setOpen(true)}
        aria-label={t("ai.title")}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-emerald-900/50 hover:scale-105 active:scale-95 transition-transform",
          view === "home" && "bottom-6 right-6"
        )}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <Bot className="h-5 w-5" />
          {alertCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 border border-white/60" />}
        </span>
        <span className="hidden sm:inline">ResQ AI</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]"
          >
            <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#0a1210]/98 shadow-2xl shadow-black/60 backdrop-blur">
              {/* header */}
              <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t("ai.title")}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> Online · EN / हिं / मरा
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setTtsOn((v) => !v);
                      stop();
                    }}
                    aria-label={t("ai.speak")}
                    className={cn("rounded-md p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400", ttsOn && "text-emerald-400")}
                  >
                    {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* messages */}
              <div ref={scrollRef} className="thin-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {lang === "hi"
                        ? "नमस्ते! मैं ResQ AI हूँ। जोखिम, पुनर्वास प्राथमिकता, योजनाओं या आज की चेतावनियों के बारे में पूछें।"
                        : lang === "mr"
                          ? "नमस्कार! मी ResQ AI. धोके, पुनर्वसन प्राधान्यक्रम, योजना किंवा आजच्या इशाऱ्यांबद्दल विचारा."
                          : "Namaste! I'm ResQ AI — grounded in live Maharashtra risk data. Ask me about hazards, relocation priority, schemes, or today's alerts."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quick.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-300 hover:bg-emerald-500/15 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-0.5 [&_strong]:font-semibold [&_strong]:text-emerald-300 [&_ul]:list-disc [&_ul]:pl-4",
                        m.role === "user"
                          ? "rounded-br-sm bg-emerald-600/90 text-white"
                          : "rounded-bl-sm border border-emerald-500/20 bg-emerald-950/40 text-foreground/95"
                      )}
                    >
                      {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-emerald-500/20 bg-emerald-950/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" /> analysing live data…
                    </div>
                  </div>
                )}
              </div>

              {/* input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 border-t border-emerald-500/20 bg-emerald-950/30 px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={mic}
                  aria-label={t("ai.listen")}
                  className={cn(
                    "rounded-lg border border-emerald-500/30 p-2 text-emerald-400 hover:bg-emerald-500/10",
                    listening && "animate-pulse bg-red-500/20 border-red-500/50 text-red-400"
                  )}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("ai.placeholder")}
                  className="min-w-0 flex-1 rounded-lg border border-emerald-500/20 bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-500 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
