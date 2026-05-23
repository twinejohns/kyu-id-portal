"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User } from 'lucide-react';

interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface GlobalChatSidebarProps {
  session: {
    name: string;
    role: string;
  };
}

export default function GlobalChatSidebar({ session }: GlobalChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Poll every 4 seconds for new chat messages
      pollInterval.current = setInterval(fetchMessages, 4000);
    } else {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom whenever messages are updated
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: session.name,
          senderRole: session.role,
          message: newMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN': return 'bg-red-100 text-red-700 border-red-200';
      case 'HR': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'MEDIAOFFICER': return 'bg-green-100 text-green-700 border-green-200';
      case 'PRINTER': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ISSUANCE': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[var(--primary-color)] text-white p-4 rounded-full shadow-2xl hover:bg-[var(--primary-dark)] transition-all transform hover:scale-105 flex items-center gap-2 border-2 border-white/20"
      >
        <MessageSquare size={22} className="animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Admin Lounge</span>
      </button>

      {/* Slide-out Sidebar Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-gray-100 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary-color)]">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[var(--primary-color)] leading-tight">Admin Lounge Chat</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Kyambogo Portal Sync</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-xs font-bold uppercase tracking-wider">Welcome to Admin Lounge</p>
              <p className="text-[10px] max-w-xs mt-1">Chat securely with other DICTS officers, HR staff, and printing agents in real time.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.senderName === session.name;
              return (
                <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-extrabold text-gray-600">{msg.senderName}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${getRoleBadgeColor(msg.senderRole)}`}>
                      {msg.senderRole}
                    </span>
                  </div>
                  <div className={`px-3 py-2.5 rounded-2xl text-xs max-w-[85%] shadow-sm ${
                    isSelf 
                      ? 'bg-[var(--primary-color)] text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border rounded-tl-none'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    <span className={`text-[8px] font-bold mt-1 block text-right ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--primary-color)] transition"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-[var(--primary-color)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition disabled:opacity-50 shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </>
  );
}
