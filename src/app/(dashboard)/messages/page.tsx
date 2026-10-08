'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getUserConversationsAction,
  getConversationMessagesAction,
  sendMessageAction,
  getEligibleRecipientsAction,
} from '@/actions/messaging.actions';
import { useRealtime } from '@/hooks/use-realtime';
import {
  MessageSquare,
  Plus,
  Send,
  User,
  Paperclip,
  Search,
  X,
  CheckCheck,
  Shield,
} from 'lucide-react';

interface ConversationItem {
  id: string;
  title: string;
  otherUser?: {
    id: string;
    fullName: string;
    email: string;
    systemRole: string;
    avatarUrl?: string | null;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: string;
  } | null;
  updatedAt: string;
  hasUnread: boolean;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  attachmentUrl?: string | null;
  createdAt: string;
  isMine: boolean;
}

interface RecipientItem {
  id: string;
  fullName: string;
  email: string;
  systemRole: string;
  avatarUrl?: string | null;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);

  const [composerText, setComposerText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    getUserConversationsAction().then((res) => {
      if (res.success) {
        setConversations(res.conversations as any);
        if (!activeConvId && res.conversations.length > 0) {
          setActiveConvId(res.conversations[0].id);
        }
      }
      setLoadingConv(false);
    });
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const loadMessages = (convId: string) => {
    setLoadingMsg(true);
    getConversationMessagesAction(convId).then((res) => {
      if (res.success) {
        setMessages(res.messages as any);
        // Clear unread indicator locally
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, hasUnread: false } : c))
        );
      }
      setLoadingMsg(false);
    });
  };

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time Message Listener for Live Delivery (No Page Refresh!)
  useRealtime({
    channels: ['global'],
    onEvent: (eventPayload) => {
      if (eventPayload.type === 'message:sent') {
        const data = eventPayload.data;
        if (data.conversationId === activeConvId) {
          setMessages((prev) => [
            ...prev,
            {
              id: data.messageId || `rt_${Date.now()}`,
              conversationId: data.conversationId,
              senderId: data.senderId,
              senderName: data.senderName || 'Sender',
              senderRole: 'USER',
              text: data.text,
              attachmentUrl: data.attachmentUrl,
              createdAt: data.createdAt || new Date().toISOString(),
              isMine: false,
            },
          ]);
        }
        loadConversations();
      }
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() && !attachmentUrl) return;

    setSending(true);
    const res = await sendMessageAction({
      conversationId: activeConvId || undefined,
      text: composerText,
      attachmentUrl: attachmentUrl || undefined,
    });

    setSending(false);

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message as any]);
      setComposerText('');
      setAttachmentUrl('');
      loadConversations();
    }
  };

  const openNewConversationModal = () => {
    setIsNewModalOpen(true);
    getEligibleRecipientsAction().then((res) => {
      if (res.success) {
        setRecipients(res.recipients);
      }
    });
  };

  const handleStartNewConversation = async () => {
    if (!selectedRecipientId) return;

    const res = await sendMessageAction({
      recipientId: selectedRecipientId,
      text: 'Hello!',
    });

    if (res.success && res.conversationId) {
      setIsNewModalOpen(false);
      setSelectedRecipientId('');
      setActiveConvId(res.conversationId);
      loadConversations();
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Internal Messaging Center
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time direct messaging between Teachers, Parents, Students, and Administrators.
          </p>
        </div>

        <button
          onClick={openNewConversationModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Main Messaging Interface Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[650px]">
        {/* Left Sidebar: Conversations Threads */}
        <div className="md:col-span-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
            {loadingConv ? (
              <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                Loading messages...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-1">
                <MessageSquare className="w-6 h-6 text-gray-300 mx-auto" />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 relative ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {conv.title.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {conv.title}
                        </p>
                        {conv.hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>

                      {conv.otherUser && (
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {conv.otherUser.systemRole}
                        </span>
                      )}

                      {conv.lastMessage && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {conv.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat Window */}
        <div className="md:col-span-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Chat Window Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {activeConv.title.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {activeConv.title}
                    </h3>
                    {activeConv.otherUser && (
                      <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {activeConv.otherUser.systemRole} • {activeConv.otherUser.email}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                  Active Realtime SSE
                </span>
              </div>

              {/* Message Bubbles Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/30 dark:bg-gray-900/20">
                {loadingMsg ? (
                  <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-gray-400">
                    No messages yet. Send a message to start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-sm ${
                          msg.isMine
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {!msg.isMine && (
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                            {msg.senderName} ({msg.senderRole})
                          </p>
                        )}
                        <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>

                        {msg.attachmentUrl && (
                          <div className="pt-2 border-t border-white/20">
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold underline flex items-center gap-1"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>View Attachment</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-gray-400 mt-1 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!composerText.trim() && !attachmentUrl)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-400 space-y-3">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Select a conversation thread
              </p>
              <p className="text-xs text-gray-400 max-w-sm">
                Choose a conversation from the left sidebar or start a new conversation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Start New Conversation
              </h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Eligible recipients are filtered strictly according to role messaging permissions.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Select Recipient *
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Recipient --</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.systemRole}) - {r.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartNewConversation}
                  disabled={!selectedRecipientId}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
