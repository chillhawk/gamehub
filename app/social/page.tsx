"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useSocialStore, ChatMessage } from "@/lib/stores";
import { Users, MessageSquare, Send, UserPlus, Search } from "lucide-react";

const MOCK_FRIENDS = [
  { id: "1", name: "CyberViper",  avatar: "🐍", status: "online",   game: "Reflex Rush" },
  { id: "2", name: "NebulaX",     avatar: "🌌", status: "away",     game: null },
  { id: "3", name: "StormBlade",  avatar: "⚡", status: "busy",     game: "Trivia Battle" },
  { id: "4", name: "ShadowFox",   avatar: "🦊", status: "offline",  game: null },
  { id: "5", name: "QuantumZero", avatar: "⚛️", status: "online",   game: "Aim Trainer" },
];

const STATUS_DOT: Record<string, string> = {
  online: "bg-nexus-green shadow-[0_0_6px_#10b981]",
  away:   "bg-nexus-gold  shadow-[0_0_6px_#f59e0b]",
  busy:   "bg-nexus-crimson shadow-[0_0_6px_#ef4444]",
  offline:"bg-nexus-dim",
};

export default function SocialPage() {
  const { player } = useAuthStore();
  const { messages, addMessage } = useSocialStore();
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "chat">("friends");

  const sendMessage = () => {
    if (!input.trim() || !player) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: player.id,
      senderName: player.displayName,
      senderAvatar: player.avatar || "🎮",
      content: input.trim(),
      timestamp: Date.now(),
      type: "text",
    };
    addMessage(msg);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-nexus-black p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="font-orbitron font-black text-4xl gradient-text">Social Hub</h1>
          <p className="text-nexus-muted mt-1">{MOCK_FRIENDS.filter((f) => f.status === "online").length} friends online</p>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { id: "friends" as const, label: "Friends", icon: <Users size={16} /> },
            { id: "chat" as const,    label: "Global Chat", icon: <MessageSquare size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-nexus-blue/20 text-nexus-blue border border-nexus-blue/30"
                  : "text-nexus-muted glass border border-nexus-blue/10 hover:text-nexus-text"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              {/* Search */}
              <div className="relative mb-5">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-dim" />
                <input placeholder="Search players…" className="w-full bg-nexus-surface border border-nexus-blue/15 rounded-xl pl-10 pr-4 py-3 text-sm text-nexus-text placeholder:text-nexus-dim focus:outline-none focus:border-nexus-blue/40 transition-all" />
              </div>

              <div className="space-y-3">
                {MOCK_FRIENDS.map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="nexus-card p-4 flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-nexus-gradient flex items-center justify-center text-2xl">{f.avatar}</div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-nexus-dark ${STATUS_DOT[f.status]}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{f.name}</p>
                      <p className={`text-xs ${f.status === "online" ? "text-nexus-green" : f.status === "away" ? "text-nexus-gold" : f.status === "busy" ? "text-nexus-crimson" : "text-nexus-dim"}`}>
                        {f.game ? `Playing ${f.game}` : f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {f.status === "online" && (
                        <motion.button whileHover={{ scale: 1.06 }} className="px-3 py-1.5 rounded-lg text-xs bg-nexus-blue/15 text-nexus-blue border border-nexus-blue/25 hover:bg-nexus-blue/25 transition-all">
                          Invite
                        </motion.button>
                      )}
                      <motion.button whileHover={{ scale: 1.06 }} className="px-3 py-1.5 rounded-lg text-xs bg-nexus-surface text-nexus-muted border border-nexus-blue/10 hover:text-nexus-text transition-all">
                        Message
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                <motion.button whileHover={{ scale: 1.02 }} className="w-full nexus-card p-4 flex items-center justify-center gap-2 text-nexus-muted hover:text-nexus-blue border-dashed transition-all">
                  <UserPlus size={18} />
                  <span className="text-sm">Add Friends</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col h-[600px]">
              {/* Messages */}
              <div className="flex-1 nexus-card rounded-2xl p-4 mb-4 overflow-y-auto space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare size={40} className="text-nexus-dim mb-3" />
                    <p className="text-nexus-muted">No messages yet. Say hello!</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === player?.id ? "flex-row-reverse" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-nexus-gradient flex items-center justify-center text-sm shrink-0">
                      {msg.senderAvatar}
                    </div>
                    <div className={`max-w-[70%] ${msg.senderId === player?.id ? "items-end" : "items-start"} flex flex-col`}>
                      <p className="text-[11px] text-nexus-dim mb-1">{msg.senderName}</p>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        msg.senderId === player?.id
                          ? "bg-nexus-blue/25 border border-nexus-blue/30 text-white"
                          : "bg-nexus-surface border border-nexus-blue/10 text-nexus-text"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Say something to the arena…"
                  className="flex-1 bg-nexus-surface border border-nexus-blue/15 rounded-xl px-4 py-3 text-sm text-nexus-text placeholder:text-nexus-dim focus:outline-none focus:border-nexus-blue/40 transition-all"
                />
                <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }} onClick={sendMessage} className="btn-nexus px-5 py-3 rounded-xl">
                  <Send size={18} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
