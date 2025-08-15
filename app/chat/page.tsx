"use client";

import type React from "react";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import logo from "@/public/logo.png";
import {
  Settings,
  Plus,
  MessageSquare,
  Edit3,
  Trash2,
  Home,
  LogOut,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuthStore } from "@/hooks/use-auth-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { api } from "@/hooks/use-auth-store";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "FirstDraft_chat_sessions";

const saveChatSessions = (sessions: ChatSession[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save chat sessions:", error);
  }
};

const loadChatSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    }
  } catch (error) {
    console.error("Failed to load chat sessions:", error);
  }
  return [];
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="ml-2 px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const email = user?.email;
  const [sessions, setSessions] = useState<any[]>([]); // [{ sessionId, ... }]
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch all sessions for the user on mount
  useEffect(() => {
    if (!email) return;
    api
      .get(`/chat/sessions/${email}`)
      .then((res: any) => {
        setSessions(res.data.sessions || []);
        if (res.data.sessions && res.data.sessions.length > 0) {
          setCurrentSessionId(res.data.sessions[0].sessionId);
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, [email]);

  // Fetch messages for the current session
  useEffect(() => {
    console.log(sessions);
    if (!currentSessionId) return;
    api
      .get(`/chat/session/${currentSessionId}`)
      .then((res: any) => setMessages(res.data.messages || []));
  }, [currentSessionId]);

  // Create new session
  const createNewChat = () => {
    const newSessionId = uuidv4();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setSessions((prev) => [{ sessionId: newSessionId, messages: [] }, ...prev]);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentSessionId || !email) return;
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsGenerating(true);
    setProgress(0);
    // Simulate progress for 2 seconds
    const start = Date.now();
    const duration = 2000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(percent);
      if (percent >= 100) {
        clearInterval(interval);
        setIsGenerating(false);
        sendToBackend(userMessage.content);
      }
    }, 50);
  };

  // Send to backend and show response
  const sendToBackend = async (message: string) => {
    try {
      const res: any = await api.post("/chat/message", {
        message,
        sessionId: currentSessionId,
        email,
      });
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content:
          res.data.response ||
          "Sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      // If sessionId was just created, update sessions list
      if (!sessions.some((s) => s.sessionId === res.data.sessionId)) {
        setSessions((prev) => [
          { sessionId: res.data.sessionId, messages: [assistantMessage] },
          ...prev,
        ]);
      }
      if (res.data.sessionTitle) {
        setSessions((prev) =>
          prev.map((s) =>
            s.sessionId === res.data.sessionId
              ? { ...s, title: res.data.sessionTitle }
              : s
          )
        );
      }
    } catch (err: any) {
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content:
          err.response?.data?.message ||
          "Sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  const selectChat = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const deleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    if (currentSessionId === sessionId) {
      const remainingSessions = sessions.filter(
        (s) => s.sessionId !== sessionId
      );
      setCurrentSessionId(
        remainingSessions.length > 0 ? remainingSessions[0].sessionId : null
      );
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/landing");
  };

  if (!hasHydrated) {
    // Optionally show a loading spinner or nothing
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="h-screen bg-[#0a0f1c] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-white">
      {/* Sidebar */}
      <div className="w-80 bg-[#0f1419] border-r border-gray-800 flex flex-col">
        {/* Sidebar Header */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/landing"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                <span className="text-black text-sm font-bold">S</span>
              </div>
              <span className="text-white font-semibold text-lg">
                FirstDraft
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/landing">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
                >
                  <Home className="w-4 h-4" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-500"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Button
            onClick={createNewChat}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 justify-start gap-3 py-3"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Create your first chat to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => selectChat(session.sessionId)}
                  className={`group flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.sessionId
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-md font-medium truncate">
                      {session.sessionTitle || "New chat"}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                    <button className="p-2 hover:bg-gray-700 rounded">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => deleteChat(session.sessionId, e)}
                      className="p-2 hover:bg-gray-700 rounded text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="px-6 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/professional-woman-diverse.png" />
              <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">
                {user?.name || "User"}
              </div>
              <div className="text-xs text-gray-400">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSessionId ? (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#10141c] rounded-lg shadow-inner">
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.length === 0 && (
                  <div className="text-center space-y-6 py-16">
                    <h1 className="text-3xl font-bold">
                      Welcome to FirstDraft
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                      Generate cinematic scripts with AI. Describe your vision,
                      and let FirstDraft bring it to life.
                    </p>
                  </div>
                )}

                {messages.map((message, idx) => (
                  <div
                    key={message.id || idx}
                    className={`flex gap-4 ${
                      message.role === "user" ? "justify-end" : ""
                    }`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                          <Image src={logo} alt="FirstDraft" />
                        </div>
                      </Avatar>
                    )}
                    <div
                      className={`flex-1 ${
                        message.role === "user" ? "flex justify-end" : ""
                      }`}
                    >
                      <div className="max-w-2xl">
                        <div
                          className={`text-sm text-gray-400 mb-2 ${
                            message.role === "user" ? "text-right" : ""
                          }`}
                        >
                          {message.role === "user" ? "You" : "FirstDraft"}
                        </div>
                        {message.role === "assistant" ? (
                          <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 mb-4 shadow-lg transition-shadow hover:shadow-2xl prose prose-invert max-w-none">
                            {message.content &&
                              message.content.length > 100 && (
                                <div className="absolute top-4 right-4 z-10">
                                  <CopyButton text={message.content} />
                                </div>
                              )}
                            <div className="pt-2 pb-1 pr-2">
                              <ReactMarkdown
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1
                                      className="text-2xl font-bold mt-4 mb-2"
                                      {...props}
                                    />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2
                                      className="text-xl font-semibold mt-3 mb-2"
                                      {...props}
                                    />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3
                                      className="text-lg font-semibold mt-2 mb-1"
                                      {...props}
                                    />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul
                                      className="list-disc ml-6 mb-2"
                                      {...props}
                                    />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol
                                      className="list-decimal ml-6 mb-2"
                                      {...props}
                                    />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="mb-1" {...props} />
                                  ),
                                  code: ({ node, ...props }) => (
                                    <code
                                      className="bg-gray-800 px-1 rounded"
                                      {...props}
                                    />
                                  ),
                                  pre: ({ node, ...props }) => (
                                    <pre
                                      className="bg-gray-800 p-2 rounded mb-2 overflow-x-auto"
                                      {...props}
                                    />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="mb-2" {...props} />
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg p-5 bg-cyan-500 text-white">
                            <p className="mb-0">{message.content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarImage src="/professional-woman-diverse.png" />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Progress Section */}
                {isGenerating && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Avatar className="w-8 h-8 mt-1">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            S
                          </span>
                        </div>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm text-gray-400 mb-2">
                          FirstDraft
                        </div>
                        <div className="bg-gray-800 rounded-lg p-5 max-w-2xl">
                          <p className="text-gray-200 mb-4">
                            Generating your script...
                          </p>
                          <div className="space-y-3">
                            <div className="text-center">
                              <p className="text-gray-400 text-sm">
                                This may take a moment.
                              </p>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="px-6 py-6 border-t border-gray-800">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Describe your cinematic vision..."
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-32 py-4"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2"
                      onClick={handleSendMessage}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-gray-400">
                No chat selected
              </h2>
              <p className="text-gray-500">Create a new chat to get started</p>
              <Button
                onClick={createNewChat}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    // Optionally show a loading spinner
    return null;
  }

  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="h-screen bg-[#0a0f1c] flex items-center justify-center text-white">
            Loading...
          </div>
        }
      >
        <ChatPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
