'use client';

import { useState } from 'react';
import { MobileLayout } from '@/components/mobile-layout';
import { useAuth } from '@/hooks/use-auth';
import LoginModal from '@/components/auth/LoginModal';
import { MessageSquare, LogIn, Loader2, Send } from 'lucide-react';
import {
  listenToConversations,
  listenToMessages,
  sendChatMessage,
  type Conversation,
  type ChatMessage,
} from '@/lib/chat';
import { useEffect, useRef } from 'react';

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToConversations(user.uid, setConversations);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!activeChat) return;
    const unsub = listenToMessages(activeChat.id, setMessages);
    return () => unsub();
  }, [activeChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !user || !activeChat) return;
    setSending(true);
    try {
      await sendChatMessage(activeChat.id, user.uid, newMsg.trim());
      setNewMsg('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <MobileLayout activeTab="messages">
        <div className="px-6 py-16 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-awder-brun">Messages</h2>
            <p className="text-sm text-awder-gold font-black uppercase tracking-[0.2em] italic">DISCUSSIONS AWDER</p>
            <p className="text-sm text-slate-500 mt-4">Connectez-vous pour voir vos discussions.</p>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="w-full py-4 bg-awder-ocre text-white rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </MobileLayout>
    );
  }

  // Vue détail conversation
  if (activeChat) {
    return (
      <MobileLayout activeTab="messages">
        <div className="flex flex-col h-[calc(100vh-10rem)]">
          <div className="px-4 py-3 border-b flex items-center gap-3 bg-white">
            <button onClick={() => setActiveChat(null)} className="p-2 rounded-xl bg-slate-100">
              ←
            </button>
            <p className="font-black text-awder-brun">{activeChat.name}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m) => {
              const isMe = m.senderId === user.uid;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm font-medium ${
                      isMe ? 'bg-awder-ocre text-white rounded-br-sm' : 'bg-white border border-slate-100 text-awder-brun rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 py-3 border-t bg-white flex gap-2">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Votre message…"
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-awder-ocre"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMsg.trim()}
              className="p-2.5 bg-awder-ocre text-white rounded-full disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Liste des conversations
  return (
    <MobileLayout activeTab="messages">
      <div className="px-6 py-10 space-y-6 pb-32">
        <div>
          <h2 className="text-4xl font-black text-awder-brun tracking-tighter">Messages</h2>
          <p className="text-sm text-awder-gold font-black uppercase tracking-[0.2em] italic mt-1">DISCUSSIONS AWDER</p>
        </div>

        {conversations.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold">Aucune conversation</p>
            <p className="text-slate-300 text-xs">Contactez un hôte depuis une annonce</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const other = conv.participants.find((p: string) => p !== user.uid);
              const name = conv.participantNames?.[other ?? ''] ?? 'Correspondant';
              const initials = name.slice(0, 2).toUpperCase();
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveChat({ id: conv.id, name, otherUid: other })}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-[24px] border border-slate-100 hover:border-awder-gold transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-awder-ocre/10 text-awder-ocre font-black flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-awder-brun text-sm">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{conv.lastMessage ?? '…'}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-awder-ocre text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
