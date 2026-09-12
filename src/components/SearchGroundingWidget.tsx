import React, { useState } from 'react';
import { Search, Globe, ExternalLink, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useProject } from './ProjectContext';
import { logUserActivity } from '../lib/activityLog';

export const SearchGroundingWidget: React.FC = () => {
  const { project } = useProject();
  const [query, setQuery] = useState(`${project.title} box office response controversy`);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    text: string;
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
    timestamp?: string;
  } | null>(null);
  const [error, setError] = useState<{ message: string; isQuota?: boolean } | null>(null);

  const formatErrorMessage = (rawError: string | object): { message: string; isQuota: boolean } => {
    let text = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
    try {
      if (typeof rawError === 'string' && rawError.startsWith('{')) {
        const parsed = JSON.parse(rawError);
        if (parsed.error?.message) {
          text = parsed.error.message;
        } else if (parsed.message) {
          text = parsed.message;
        }
      }
    } catch {
      // not json, keep string
    }

    const isQuota = text.toLowerCase().includes('quota') ||
      text.toLowerCase().includes('429') ||
      text.toLowerCase().includes('resource_exhausted');

    if (isQuota) {
      return {
        message: 'Gemini Search Grounding quota rate limit exceeded (429). The system can synthesize live intelligence from verified news feeds.',
        isQuota: true,
      };
    }

    return { message: text, isQuota: false };
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    logUserActivity(`Google Search Grounding: "${query.slice(0, 40)}"`, 'SEARCH', `Topic: ${project.title}`);

    try {
      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topic: project.title }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          text: data.text,
          groundingMetadata: data.groundingMetadata,
          timestamp: data.timestamp,
        });
      } else {
        setError(formatErrorMessage(data.error || 'Search grounding request failed.'));
      }
    } catch (err: any) {
      setError(formatErrorMessage(err?.message || 'Failed to communicate with Gemini Search Grounding API.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Google Search Grounding</h3>
            <p className="text-xs text-slate-400">Gemini 3.5 Flash live web verification for {project.title}</p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
          Live Search API
        </span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search live web grounding for ${project.title}...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
        >
          {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Grounded Search</span>
        </button>
      </form>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-200">
              {error.isQuota ? 'Gemini API Quota Exhausted (429)' : 'Grounding Search Alert'}
            </div>
            <p className="text-[11.5px] text-rose-300/90 leading-relaxed">
              {error.message}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Grounded Intelligence Synthesized</span>
            </span>
            {result.timestamp && <span className="font-mono text-[10px]">{new Date(result.timestamp).toLocaleTimeString()}</span>}
          </div>

          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{result.text}</p>

          {result.groundingMetadata?.groundingChunks && (
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Verified Web Sources ({result.groundingMetadata.groundingChunks.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {result.groundingMetadata.groundingChunks.map((chunk, idx) => {
                  if (!chunk.web) return null;
                  return (
                    <a
                      key={idx}
                      href={chunk.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-blue-400 flex items-center justify-between transition-colors group"
                    >
                      <span className="truncate pr-2 text-slate-300 group-hover:text-blue-300">
                        {chunk.web.title || chunk.web.uri}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
