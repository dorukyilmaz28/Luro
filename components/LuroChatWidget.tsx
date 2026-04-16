"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Role = "bot" | "user";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
};

const quickActions = [
  { id: "nedir", label: "Luro nedir?" },
  { id: "nasil", label: "Nasıl çalışır?" },
  { id: "alanlar", label: "Hangi alanlarda kullanılır?" },
  { id: "demo", label: "Demo talep etmek istiyorum" },
] as const;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Gemini API: ilk karşılama balonunu geçmişe dahil etme; model user ile başlamalı. */
function buildGeminiHistory(messages: ChatMessage[]): { role: "user" | "model"; text: string }[] {
  const skipWelcome = messages.length > 0 && messages[0].role === "bot";
  const slice = skipWelcome ? messages.slice(1) : messages;
  return slice.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    text: m.text,
  }));
}

export function LuroChatWidget() {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, open, aiLoading, scrollToBottom]);

  const pushBot = (text: string) => {
    setMessages((m) => [...m, { id: uid(), role: "bot", text }]);
  };

  const pushUser = (text: string) => {
    setMessages((m) => [...m, { id: uid(), role: "user", text }]);
  };

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      pushBot("Merhaba \u{1F44B} Luro hakkında bilgi almak ister misiniz?");
      setShowQuickActions(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleQuickAction = (id: (typeof quickActions)[number]["id"]) => {
    const label = quickActions.find((a) => a.id === id)?.label ?? "";

    if (id === "demo") {
      pushUser(label);
      setShowQuickActions(false);
      router.push("/demo");
      return;
    }

    pushUser(label);
    setShowQuickActions(false);

    if (id === "nedir") {
      pushBot(
        "Luro, mevcut kameraları kullanarak riskleri tespit eden yapay zeka destekli bir güvenlik izleme platformudur."
      );
      setShowQuickActions(true);
      return;
    }

    if (id === "nasil") {
      pushBot(
        "Kısaca üç adımda çalışır:\n\n1) Kamera görüntüsü alınır\n2) Yapay zeka analiz eder\n3) Riskler tespit edilip uyarı oluşturulur"
      );
      setShowQuickActions(true);
      return;
    }

    if (id === "alanlar") {
      pushBot(
        "Öne çıkan kullanım alanları:\n\n• İnşaat sahaları\n• Depolar\n• Lojistik merkezleri\n• Endüstriyel operasyonlar"
      );
      setShowQuickActions(true);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = aiInput.trim();
    if (!trimmed || aiLoading) return;

    const historyBefore = buildGeminiHistory(messages);

    setAiInput("");
    pushUser(trimmed);
    setAiLoading(true);
    setShowQuickActions(false);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: historyBefore,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string; debug?: string };

      if (!res.ok) {
        if (process.env.NODE_ENV === "development" && data.debug) {
          console.warn("[/api/gemini]", data.debug);
        }
        pushBot(data.error || "Yanıt alınamadı. Lütfen tekrar deneyin.");
        return;
      }

      if (data.text) {
        pushBot(data.text);
      }
    } catch {
      pushBot("Bağlantı hatası. İnternetinizi kontrol edip tekrar deneyin.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-none fixed right-3 z-[100] flex flex-col items-end gap-3 sm:right-5 md:right-8"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        paddingRight: "max(0px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div
        id={panelId}
        role="dialog"
        aria-label="Luro asistanı"
        aria-hidden={!open}
        className={`pointer-events-auto flex max-h-[min(85dvh,640px)] w-[min(100vw-1.25rem,380px)] flex-col origin-bottom-right overflow-hidden rounded-2xl border border-white/10 bg-[#0b1f3a] shadow-[0_24px_48px_rgba(11,31,58,0.35)] transition-all duration-300 ease-out sm:w-[min(100vw-2rem,380px)] ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#d4a64a]" aria-hidden />
            <span className="text-sm font-medium text-white">Luro Asistan</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Sohbeti kapat"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#0b1f3a] px-4 py-4"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white/10 text-slate-100"
                    : "bg-white text-slate-900"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {aiLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/10 px-3.5 py-2.5 text-sm text-slate-300">
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">Yanıt hazırlanıyor</span>
                  <span className="text-[#d4a64a]">…</span>
                </span>
              </div>
            </div>
          )}

          {showQuickActions && messages.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              {quickActions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleQuickAction(a.id)}
                  className="rounded-xl border border-[#d4a64a]/35 bg-[#d4a64a]/10 px-3 py-2.5 text-left text-sm text-[#f8ebcf] transition hover:border-[#d4a64a]/55 hover:bg-[#d4a64a]/15"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#0b1f3a] p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Soru sorun (Gemini)
          </p>
          <form onSubmit={handleAiSubmit} className="flex gap-2">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Luro veya güvenlik izleme hakkında yazın…"
              disabled={aiLoading}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-[#d4a64a]/50 focus:ring-1 focus:ring-[#d4a64a]/30 disabled:opacity-60 sm:text-sm"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiInput.trim()}
              className="shrink-0 rounded-xl bg-[#d4a64a] px-4 py-2 text-sm font-medium text-[#0b1f3a] transition hover:bg-[#e1b558] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Gönder
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Demo için{" "}
            <Link href="/demo" className="text-[#d4a64a] underline-offset-2 hover:underline">
              form sayfası
            </Link>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        className="pointer-events-auto relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-[#0b1f3a] text-white shadow-[0_14px_36px_rgba(11,31,58,0.42)] ring-2 ring-[#d4a64a]/35 ring-offset-2 ring-offset-[#FAF5EF] transition hover:bg-[#0f2a52] hover:ring-[#d4a64a]/55 hover:shadow-[0_18px_44px_rgba(11,31,58,0.48)] md:h-16 md:w-16"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Asistanı kapat" : "Asistanı aç"}
      >
        {!open && (
          <span
            className="absolute inset-0 rounded-full bg-[#d4a64a]/15"
            aria-hidden
          />
        )}
        {open ? (
          <svg className="relative h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="relative h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
