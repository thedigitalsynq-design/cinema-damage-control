import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Search,
  Bot,
  User as UserIcon,
  Zap,
  Brain,
  Globe,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useProject } from './ProjectContext';
import { logUserActivity } from '../lib/activityLog';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
  };
  timestamp: string;
}

interface GeminiWarRoomChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  {
    id: 'pr_strategist',
    label: 'Chief PR & Crisis Strategist',
    system: 'You are the Chief PR & Crisis Strategist in the Cinema Damage Control Room. You specialize in Indian and global box office crisis mitigation, anti-piracy DMCA interventions, fan conflict resolution, review-bombing countermeasures, and studio reputation defense. Provide authoritative, concise, and structured tactical guidance.',
  },
  {
    id: 'box_office_analyst',
    label: 'Box Office & Market Analyst',
    system: 'You are a Senior Box Office & Market Data Analyst specializing in Indian multi-language releases (Hindi, Kannada, Telugu, Tamil, Malayalam) and global theatrical tracking. Focus on financial impact, occupancy, opening weekend projections, and competitor counter-programming.',
  },
  {
    id: 'dmca_legal_guard',
    label: 'Piracy & Legal Compliance Counsel',
    system: 'You are the Legal & Anti-Piracy Counsel for the cinema studio. Focus on copyright enforcement, automated DMCA takedown notice structuring, Telegram/leak site remediation, and legal liability assessment.',
  },
];

const MODELS = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    badge: 'General',
    description: 'Balanced speed & intelligence for general PR tasks',
    icon: Sparkles,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Complex',
    description: 'Deep strategic reasoning & complex threat analysis',
    icon: Brain,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    badge: 'Fast',
    description: 'Ultra-fast responses for quick statements & checks',
    icon: Zap,
  },
];

export const GeminiWarRoomChat: React.FC<GeminiWarRoomChatProps> = ({ isOpen, onClose }) => {
  const { project } = useProject();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: `Welcome to the **Cinema Crisis AI War Room**. I am configured to monitor tracking and active telemetry for **${project.title}**.\n\nHow can I assist your team today? I can draft crisis press statements, evaluate leak risks, analyze sentiment shifts, or recommend counter-programming strategies.`,
      modelUsed: 'gemini-3.5-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [enableSearch, setEnableSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Log user activity
    logUserActivity(`AI Chat Prompt: "${prompt.slice(0, 40)}..."`, 'AI_CHAT', `Model: ${selectedModel}`);

    try {
      // Build conversation history for API
      const history = messages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const systemInstruction = `${selectedRole.system}\nContext: Currently tracking movie project "${project.title}" (${project.subtitle}). Keywords: ${project.keywords.join(', ')}. Status: ${project.theatricalStatus || 'Active Tracking'}.`;

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history,
          model: selectedModel,
          systemInstruction,
          enableSearch,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const botMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'model',
          content: data.text,
          modelUsed: data.modelUsed,
          groundingMetadata: data.groundingMetadata,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `⚠️ **API Notice:** ${data.error || 'Failed to get AI response'}. Retrying with offline tactical baseline advice:\n\n*Recommendation:* Issue an immediate factual press update acknowledging verified studio timelines and activate search grounding filters.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Connection Error:** ${err?.message || 'Unable to reach Gemini API backend'}. Ensure local server is online.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] md:w-[780px] md:h-[680px]' : 'w-[95vw] sm:w-[480px] h-[620px]'
      }`}
    >
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm">War Room AI Advisor</h3>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Live Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400">Project: {project.title}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            title={enableSearch ? 'Google Search Grounding Enabled' : 'Enable Search Grounding'}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition-colors ${
              enableSearch
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Bar: Model & Role selection */}
      <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex flex-wrap gap-2 items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
          {MODELS.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{m.badge}</span>
              </button>
            );
          })}
        </div>

        <select
          value={selectedRole.id}
          onChange={(e) => {
            const found = ROLES.find((r) => r.id === e.target.value);
            if (found) setSelectedRole(found);
          }}
          className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-rose-500"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              Role: {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-rose-400 border border-slate-700'
                }`}
              >
                {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className={`max-w-[82%] space-y-1 ${isUser ? 'text-right' : ''}`}>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 px-1">
                  <span>{isUser ? 'You' : 'War Room Advisor'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.modelUsed && (
                    <span className="font-mono text-slate-600 bg-slate-900 px-1 rounded border border-slate-800">
                      {msg.modelUsed.replace('gemini-', '')}
                    </span>
                  )}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-rose-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Grounding metadata display */}
                  {msg.groundingMetadata && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
                        <Search className="w-3 h-3" />
                        <span>Google Search Grounding Sources:</span>
                      </div>
                      {msg.groundingMetadata.webSearchQueries && (
                        <p className="text-[10px] text-slate-500">
                          Queries: {msg.groundingMetadata.webSearchQueries.join(', ')}
                        </p>
                      )}
                      {msg.groundingMetadata.groundingChunks?.map((chunk, idx) => {
                        if (!chunk.web) return null;
                        return (
                          <a
                            key={idx}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-400 hover:underline text-[10px] truncate"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2.5 text-slate-400 text-xs py-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-rose-400 border border-slate-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-2xl flex items-center space-x-2 text-slate-400">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span>Analyzing crisis intelligence with {selectedModel}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="bg-slate-950/80 px-3 py-1.5 border-t border-slate-900 flex space-x-2 overflow-x-auto text-[11px]">
        <button
          onClick={() => setInput(`Draft an urgent press statement addressing box office rumors for ${project.title}.`)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
        >
          📝 Draft Press Release
        </button>
        <button
          onClick={() => setInput(`What counter-measures do you recommend against review-bombing on ${project.title}?`)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
        >
          🛡️ Counter Review Bombing
        </button>
        <button
          onClick={() => setInput(`Search live web data for latest piracy leaks and social sentiment on ${project.title}.`)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
        >
          🌐 Search Live Grounding
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="bg-slate-950 p-3 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${selectedRole.label} (${selectedModel})...`}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/80 transition-colors"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-lg shadow-rose-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
