import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { socialPosts as fallbackPosts, platformData as fallbackPlatforms } from '../data/mockData';
import { LiveBanner } from '../components/LiveBanner';
import { GIcon } from '../components/GIcon';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useToast } from '../components/Toaster';
import { dispatchCreateIncident } from '../lib/actionDispatcher';
import {
  api,
  estimateReach,
  parseReach,
  type ScrapedSocialResult,
  type WebScraperResult,
  type AgentReachDoctorResponse,
} from '../data/apiService';

const platformColors: Record<string, string> = {
  X: 'bg-white text-black',
  INSTAGRAM: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
  YOUTUBE: 'bg-red-500 text-white',
  REDDIT: 'bg-orange-500 text-white',
  FACEBOOK: 'bg-[#0a84ff] text-white',
};

export function SocialIntelligence() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const { project } = useProject();
  const { news, liveSocial, isLive, lastUpdated: _lastUpdated, refresh, isLoading } = useLiveData(project.keywords.join(','));

  // Live scraper states
  const [scrapedSocial, setScrapedSocial] = useState<ScrapedSocialResult | null>(null);
  const [isScrapingSocial, setIsScrapingSocial] = useState(false);
  const [webUrlInput, setWebUrlInput] = useState('');
  const [isScrapingWeb, setIsScrapingWeb] = useState(false);
  const [webResult, setWebResult] = useState<WebScraperResult | null>(null);
  const [webError, setWebError] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'STREAM' | 'SCRAPER_CONSOLE'>('STREAM');

  // Agent Reach doctor & scraping states
  const [doctorData, setDoctorData] = useState<AgentReachDoctorResponse | null>(null);
  const [isDoctorLoading, setIsDoctorLoading] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showMarkdownRaw, setShowMarkdownRaw] = useState(false);

  const handleEscalateThreat = async (title: string, author: string, reach: string, platform: string, excerpt: string) => {
    try {
      await dispatchCreateIncident({
        title: `Social Threat Vector: ${title}`,
        severity: 'HIGH',
        reach,
        recommendation: `Issue countermeasure against viral post by ${author} on ${platform}.`,
        status: 'MONITORING',
        whatWeKnow: excerpt,
        whatWeDontKnow: ['Identify network coordinating handles', 'Verify bot amplification velocity'],
        recommendedActions: ['Dispatch social rebuttal', 'Issue platform takedown report'],
      });
      toast(`Escalated "${title.substring(0, 35)}..." to Threat Incidents`, 'warn');
      navigate('/incidents');
    } catch {
      toast('Failed to log threat incident', 'warn');
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const loadScrapedData = async () => {
      setIsScrapingSocial(true);
      try {
        const res = await api.scrapeSocial(project.keywords.join(' ') || project.title);
        if (!isCancelled && res && res.success) {
          setScrapedSocial(res);
        }
      } catch (err) {
        console.warn('Scraping error:', err);
      } finally {
        if (!isCancelled) setIsScrapingSocial(false);
      }
    };
    loadScrapedData();
    return () => {
      isCancelled = true;
    };
  }, [project.title, project.keywords]);

  // Load Agent-Reach Doctor telemetry on component mount
  useEffect(() => {
    const fetchDoctor = async () => {
      setIsDoctorLoading(true);
      try {
        const doc = await api.getAgentReachDoctor();
        setDoctorData(doc);
      } catch (err) {
        console.warn('Agent-Reach doctor check failed:', err);
      } finally {
        setIsDoctorLoading(false);
      }
    };
    fetchDoctor();
  }, []);

  // Manual re-scrape action
  const fetchScrapedSocial = async () => {
    setIsScrapingSocial(true);
    try {
      const res = await api.scrapeSocial(project.keywords.join(' ') || project.title);
      if (res && res.success) {
        setScrapedSocial(res);
      }
    } catch (err) {
      console.warn('Scraping error:', err);
    } finally {
      setIsScrapingSocial(false);
    }
  };

  // Execute web crawler on specific URL or topic using Agent-Reach
  const handleScrapeWeb = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();
    const target = customTarget || webUrlInput;
    if (!target.trim()) return;

    setIsScrapingWeb(true);
    setWebError(null);
    try {
      const isUrl = target.startsWith('http://') || target.startsWith('https://');
      const res = await api.scrapeWithAgentReach(isUrl ? { url: target.trim() } : { query: target.trim() });
      if (res && res.success) {
        setWebResult(res);
        toast(`Scraped via ${res.provider || 'Agent Reach'} (${res.wordCount || 0} words)`, 'success');
      } else {
        setWebError(res?.error || 'Could not parse web content from target');
        toast('Scrape target failed', 'warn');
      }
    } catch (err: any) {
      setWebError(err?.message || 'Failed to crawl target');
      toast('Network error during scrape', 'warn');
    } finally {
      setIsScrapingWeb(false);
    }
  };

  const activePosts = liveSocial?.socialPosts && liveSocial.socialPosts.length > 0 ? liveSocial.socialPosts : fallbackPosts;
  const activePlatforms = liveSocial?.platformData && liveSocial.platformData.length > 0 ? liveSocial.platformData : fallbackPlatforms;

  const tabs = ['ALL', 'X', 'INSTAGRAM', 'YOUTUBE', 'REDDIT', 'FACEBOOK'];
  const filtered = activeTab === 'ALL' ? activePosts : activePosts.filter((p) => p.platform === activeTab);

  const outletMix = (() => {
    if (!isLive || news.length === 0) return [];
    const map = new Map<string, { count: number; reach: number }>();
    for (const item of news) {
      const src = item.source || 'Unknown';
      const e = map.get(src) || { count: 0, reach: 0 };
      e.count++;
      e.reach += parseReach(estimateReach(item.source || ''));
      map.set(src, e);
    }
    const max = Math.max(1, ...[...map.values()].map((v) => v.count));
    return [...map.entries()]
      .map(([source, v]) => ({ source, ...v, width: Math.round((v.count / max) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#30d158]/30 bg-[#30d158]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#30d158]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] animate-pulse" />
                MULTI-PLATFORM LIVE SCRAPER ACTIVE
              </span>
            </div>
            <h1 className="apple-title mt-0.5">Social & Web Intelligence</h1>
            <p className="apple-subhead mt-1">
              Real-time social media scraping (X/Twitter, Reddit, YouTube, Instagram) and deep web article analysis for {project.title}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full bg-white/[0.05] p-1 border border-white/10 text-[12px]">
              <button
                onClick={() => setActiveViewMode('STREAM')}
                className={clsx(
                  'px-3 py-1 rounded-full font-medium transition',
                  activeViewMode === 'STREAM' ? 'bg-white text-black shadow' : 'text-war-text-muted hover:text-white'
                )}
              >
                Stream View
              </button>
              <button
                onClick={() => setActiveViewMode('SCRAPER_CONSOLE')}
                className={clsx(
                  'px-3 py-1 rounded-full font-medium transition flex items-center gap-1.5',
                  activeViewMode === 'SCRAPER_CONSOLE' ? 'bg-[#0a84ff] text-white shadow' : 'text-war-text-muted hover:text-white'
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Live Scraper Console
              </button>
            </div>

            <button
              onClick={() => {
                refresh();
                fetchScrapedSocial();
              }}
              disabled={isLoading || isScrapingSocial}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <GIcon name="refresh" size={13} className={isLoading || isScrapingSocial ? 'animate-spin' : ''} />
              <span>{isLoading || isScrapingSocial ? 'Scraping live feeds...' : 'Sync & Re-scrape'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Scraper Telemetry Cards */}
        {scrapedSocial && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Live Scraped Items</span>
                <span className="h-2 w-2 rounded-full bg-[#30d158] animate-ping" />
              </div>
              <div className="mt-1 text-[22px] font-bold tabular-nums text-white">{scrapedSocial.totalScraped} mentions</div>
              <div className="mt-1 text-[12px] text-war-text-muted">Across X, Reddit, YouTube & Reels</div>
            </div>

            <div className="glass-panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Astroturf / Bot Smear Risk</span>
                <span className={clsx(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                  scrapedSocial.astroturfThreatScore > 60 ? 'bg-[#ff453a]/20 text-[#ff6961]' : scrapedSocial.astroturfThreatScore > 30 ? 'bg-[#ff9f0a]/20 text-[#ffb340]' : 'bg-[#30d158]/20 text-[#30d158]'
                )}>
                  {scrapedSocial.astroturfThreatScore > 60 ? 'HIGH SMEAR' : scrapedSocial.astroturfThreatScore > 30 ? 'MODERATE' : 'ORGANIC'}
                </span>
              </div>
              <div className="mt-1 text-[22px] font-bold tabular-nums text-white">{scrapedSocial.astroturfThreatScore}%</div>
              <div className="mt-1 text-[12px] text-war-text-muted">Repetitive smear phrase velocity</div>
            </div>

            <div className="glass-panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Leak / Piracy Triggers</span>
                <span className="text-[12px] text-[#ffd60a] font-semibold">Vigilance</span>
              </div>
              <div className="mt-1 text-[22px] font-bold tabular-nums text-[#ffd60a]">{scrapedSocial.detectedLeaksCount} links detected</div>
              <div className="mt-1 text-[12px] text-war-text-muted">Screeners, telegram or cam-rip talk</div>
            </div>

            <div className="glass-panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Audience Polarity</span>
                <span className="text-[12px] text-white tabular-nums">{scrapedSocial.sentimentDistribution.positive}% Pos</span>
              </div>
              <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div style={{ width: `${scrapedSocial.sentimentDistribution.positive}%` }} className="bg-[#30d158]" />
                <div style={{ width: `${scrapedSocial.sentimentDistribution.neutral}%` }} className="bg-white/30" />
                <div style={{ width: `${scrapedSocial.sentimentDistribution.negative}%` }} className="bg-[#ff453a]" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-war-text-muted">
                <span className="text-[#30d158]">Pos {scrapedSocial.sentimentDistribution.positive}%</span>
                <span>Neu {scrapedSocial.sentimentDistribution.neutral}%</span>
                <span className="text-[#ff6961]">Neg {scrapedSocial.sentimentDistribution.negative}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Trending Scraped Hashtags */}
        {scrapedSocial && scrapedSocial.topHashtags.length > 0 && (
          <div className="glass-panel p-3.5 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-war-text-secondary flex items-center gap-1.5 mr-2">
              <GIcon name="tag" size={14} className="text-[#0a84ff]" />
              Scraped Viral Hashtags:
            </span>
            {scrapedSocial.topHashtags.map((h) => (
              <span
                key={h.tag}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white"
              >
                <span className="font-semibold text-white">{h.tag}</span>
                <span className="rounded-full bg-white/[0.1] px-1.5 py-0.2 text-[10px] tabular-nums text-war-text-muted">{h.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Agent Reach Multi-Platform Scraper Console */}
        <div className="glass-panel p-5 border border-[#0a84ff]/30 bg-gradient-to-b from-[#0a84ff]/[0.04] via-black/20 to-transparent">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#30d158] animate-pulse" />
                <span className="section-title text-[15px] font-bold tracking-tight text-white">
                  Agent Reach Internet Scraper Engine
                </span>
                <span className="rounded-full bg-[#0a84ff]/20 px-2 py-0.5 text-[10px] font-bold text-[#0a84ff] border border-[#0a84ff]/30">
                  ZERO API FEES
                </span>
              </div>
              <p className="apple-footnote mt-0.5 text-war-text-secondary">
                Powered by <strong className="text-white">Panniantong/Agent-Reach</strong> & Jina Reader. Scrape public tweets, Reddit discussions, YouTube transcripts, and news articles directly into clean Markdown.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDoctorModal(true)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/[0.1]"
              >
                <GIcon name="health_and_safety" size={14} className="text-[#30d158]" />
                <span>Doctor Channels ({doctorData?.activeChannelsCount ?? 4}/{doctorData?.totalChannelsCount ?? 15})</span>
              </button>
            </div>
          </div>

          {/* Quick Active Platform Indicators */}
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3 text-[11px]">
            <span className="text-war-text-muted font-medium">Active Backends:</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#30d158]/10 border border-[#30d158]/20 px-2 py-0.5 text-[#30d158] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#30d158]" />
              🌐 Web (Jina Reader)
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#0a84ff]/10 border border-[#0a84ff]/20 px-2 py-0.5 text-[#0a84ff] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a84ff]" />
              💬 Reddit (Cinephile Subreddits)
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 px-2 py-0.5 text-[#ff9f0a] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff9f0a]" />
              📺 YouTube Video Feeds
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-purple-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              🐦 X / Twitter Public Stream
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 text-pink-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
              📺 B站 Bilibili Direct API
            </span>
          </div>

          {/* Scrape Input Form */}
          <form onSubmit={handleScrapeWeb} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={webUrlInput}
                onChange={(e) => setWebUrlInput(e.target.value)}
                placeholder={`Paste any article/review URL (Sacnilk, Pinkvilla, YouTube, Reddit) or type a search topic for ${project.title}...`}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-[13px] text-white placeholder:text-war-text-muted focus:border-[#0a84ff] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isScrapingWeb || !webUrlInput.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0a84ff] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#0a84ff]/90 disabled:opacity-50"
            >
              {isScrapingWeb ? (
                <>
                  <GIcon name="refresh" size={14} className="animate-spin" />
                  <span>Agent Reach Scraping...</span>
                </>
              ) : (
                <>
                  <GIcon name="travel_explore" size={15} />
                  <span>Deep Scrape Target</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Quick Scan Pills */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-war-text-muted">
            <span>Quick targets:</span>
            <button
              type="button"
              onClick={() => {
                const target = `${project.title} box office collection Sacnilk`;
                setWebUrlInput(target);
                handleScrapeWeb(undefined, target);
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white"
            >
              📊 Sacnilk Box Office
            </button>
            <button
              type="button"
              onClick={() => {
                const target = `${project.title} movie public talk review YouTube`;
                setWebUrlInput(target);
                handleScrapeWeb(undefined, target);
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white"
            >
              📺 YouTube Audience Reviews
            </button>
            <button
              type="button"
              onClick={() => {
                const target = `${project.title} cinema discussion Reddit`;
                setWebUrlInput(target);
                handleScrapeWeb(undefined, target);
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white"
            >
              💬 Reddit Cinephiles
            </button>
            <button
              type="button"
              onClick={() => {
                const target = `${project.title} Bollywood Hungama collection review`;
                setWebUrlInput(target);
                handleScrapeWeb(undefined, target);
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white"
            >
              📰 Bollywood Hungama
            </button>
          </div>

          {webError && (
            <div className="mt-3 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 p-3 text-[12px] text-[#ff6961]">
              Agent Reach scraping notice: {webError}
            </div>
          )}

          {webResult && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#0a84ff]/20 px-2 py-0.5 text-[10px] font-bold text-[#0a84ff]">
                      {webResult.provider || 'Agent Reach (Jina Reader)'}
                    </span>
                    <span className="text-[11px] font-semibold text-white truncate">
                      {webResult.title || 'Scraped Target'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] font-mono text-war-text-muted truncate max-w-2xl">{webResult.scrapedUrl}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.05] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setShowMarkdownRaw(false)}
                      className={clsx(
                        'px-2.5 py-1 rounded-md font-medium transition',
                        !showMarkdownRaw ? 'bg-white text-black font-semibold' : 'text-war-text-muted hover:text-white'
                      )}
                    >
                      Intelligence & Signals
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMarkdownRaw(true)}
                      className={clsx(
                        'px-2.5 py-1 rounded-md font-medium transition',
                        showMarkdownRaw ? 'bg-[#0a84ff] text-white font-semibold' : 'text-war-text-muted hover:text-white'
                      )}
                    >
                      Clean Markdown
                    </button>
                  </div>

                  <span className={clsx(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase',
                    webResult.riskLevel === 'CRITICAL' ? 'bg-[#ff453a]/20 text-[#ff6961]' : webResult.riskLevel === 'HIGH' ? 'bg-[#ff9f0a]/20 text-[#ffb340]' : 'bg-[#30d158]/20 text-[#30d158]'
                  )}>
                    Risk: {webResult.riskLevel}
                  </span>
                </div>
              </div>

              {!showMarkdownRaw ? (
                <>
                  {/* Signals Flagged by Web Scraper */}
                  {webResult.signalsDetected && (
                    <div className="flex flex-wrap gap-2">
                      <span className={clsx(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium',
                        webResult.signalsDetected.censorOrCBFC ? 'bg-[#ff9f0a]/15 text-[#ffb340] border border-[#ff9f0a]/30' : 'bg-white/[0.04] text-war-text-muted'
                      )}>
                        CBFC / Censor Dispute: {webResult.signalsDetected.censorOrCBFC ? 'DETECTED' : 'None'}
                      </span>
                      <span className={clsx(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium',
                        webResult.signalsDetected.fakeCollectionsOrDispute ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30' : 'bg-white/[0.04] text-war-text-muted'
                      )}>
                        Box Office Inflation / Discrepancy: {webResult.signalsDetected.fakeCollectionsOrDispute ? 'DETECTED' : 'None'}
                      </span>
                      <span className={clsx(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium',
                        webResult.signalsDetected.fanWarOrReviewBomb ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30' : 'bg-white/[0.04] text-war-text-muted'
                      )}>
                        Coordinated Smear / Review Bomb: {webResult.signalsDetected.fanWarOrReviewBomb ? 'DETECTED' : 'None'}
                      </span>
                      <span className={clsx(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium',
                        webResult.signalsDetected.plagiarismOrCopyright ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30' : 'bg-white/[0.04] text-war-text-muted'
                      )}>
                        Plagiarism / Legal Notice: {webResult.signalsDetected.plagiarismOrCopyright ? 'DETECTED' : 'None'}
                      </span>
                      {webResult.signalsDetected.piracyOrLeaks && (
                        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/40 animate-pulse">
                          🚨 Torrent / Screener Piracy: DETECTED
                        </span>
                      )}
                    </div>
                  )}

                  {/* Summary Excerpt */}
                  {webResult.summaryExcerpt && (
                    <div className="rounded-lg bg-white/[0.03] p-3 text-[12px] text-war-text-secondary leading-relaxed border border-white/[0.05]">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">Key Excerpt</span>
                      {webResult.summaryExcerpt}
                    </div>
                  )}

                  {/* Extracted Core Claims */}
                  {webResult.extractedClaims && webResult.extractedClaims.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-white">Extracted Key Claims & Arguments:</span>
                        <span className="text-[11px] text-war-text-muted tabular-nums">{webResult.wordCount} words scanned</span>
                      </div>
                      {webResult.extractedClaims.map((claim, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[12px] text-war-text-secondary leading-relaxed bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                          <span className="text-[#0a84ff] font-bold">#{idx + 1}</span>
                          <span>"{claim}"</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => handleEscalateThreat(
                        webResult.title || 'Scraped Threat Vector',
                        webResult.provider || 'Agent Reach',
                        '~1.2M',
                        'WEB_SCRAPER',
                        webResult.summaryExcerpt || webResult.title || ''
                      )}
                      className="flex items-center gap-1.5 rounded-lg border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-3 py-1.5 text-[11px] font-semibold text-[#ffb340] transition hover:bg-[#ff9f0a]/20 hover:text-white"
                    >
                      <GIcon name="warning" size={13} />
                      <span>Escalate Scraped Findings to Incident Desk</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Raw Clean Markdown View from Agent Reach / Jina Reader */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-war-text-muted">
                    <span>Parsed Markdown Output ({webResult.wordCount} words)</span>
                    <span className="font-mono text-[#0a84ff]">Markdown (zero html cruft)</span>
                  </div>
                  <pre className="max-h-72 overflow-y-auto rounded-lg bg-black/60 p-3 text-[12px] font-mono text-war-text-secondary leading-relaxed border border-white/10 whitespace-pre-wrap">
                    {webResult.markdown || 'No raw markdown available.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <LiveBanner />

        {outletMix.length > 0 && (
          <div className="glass-panel p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="section-title">Live outlet mix</span>
              <span className="apple-footnote">who is driving coverage right now</span>
            </div>
            <div className="space-y-2.5">
              {outletMix.map((o) => (
                <div key={o.source}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="truncate text-war-text-secondary">{o.source}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-white">{o.count} stories</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${o.width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {activePlatforms.map((p) => (
            <div key={p.platform} className="glass-panel apple-card-hover p-4 text-center">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">{p.platform.toLowerCase()}</div>
              <div className="text-[20px] font-bold tabular-nums tracking-tight text-white">{(p.mentions / 1000).toFixed(0)}K</div>
              <div className="text-[12px] text-war-text-muted">mentions</div>
              <div className={clsx('mt-1 text-[13px] font-semibold tabular-nums', p.sentiment < -30 ? 'text-[#ff6961]' : p.sentiment < -10 ? 'text-[#ffb340]' : 'text-[#ffd60a]')}>
                {p.sentiment > 0 ? `+${p.sentiment}` : p.sentiment}%
              </div>
              <div className="text-[12px] tabular-nums text-war-text-muted">{p.reach} reach</div>
            </div>
          ))}
        </div>

        {/* Segmented tabs */}
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97]',
                activeTab === tab
                  ? 'bg-white text-black shadow'
                  : 'text-war-text-secondary hover:text-white'
              )}
            >
              {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Scraped Live Posts Stream or Fallback Feed */}
        {activeViewMode === 'SCRAPER_CONSOLE' && scrapedSocial?.posts && scrapedSocial.posts.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[13px] font-semibold text-white">Direct Scraped Social Records ({scrapedSocial.posts.length})</span>
              <span className="text-[11px] text-war-text-muted">Real-time parsed from public syndications</span>
            </div>
            {scrapedSocial.posts
              .filter((p) => activeTab === 'ALL' || p.platform === activeTab)
              .map((post) => (
                <div key={post.id} className="glass-panel apple-card-hover p-5 border-l-4 border-l-[#0a84ff]">
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold', platformColors[post.platform])}>
                        {post.platform.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-white flex items-center gap-2">
                          <span>{post.author}</span>
                          <span className={clsx(
                            'rounded px-1.5 py-0.2 text-[10px] font-bold uppercase',
                            post.category === 'LEAK_INTEL' ? 'bg-[#ffd60a]/20 text-[#ffd60a]' : post.category === 'COORDINATED_SMEAR' ? 'bg-[#ff453a]/20 text-[#ff6961]' : post.category === 'FAN_CAMPAIGN' ? 'bg-[#30d158]/20 text-[#30d158]' : 'bg-white/[0.08] text-war-text-muted'
                          )}>
                            {post.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-war-text-muted">{post.reachTier}</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-war-text-muted">
                      {post.pubDate ? new Date(post.pubDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'recent'}
                    </span>
                  </div>

                  <p className="mb-3 text-[13px] leading-relaxed text-war-text-secondary">{post.text}</p>

                  <div className="flex flex-wrap items-center justify-between border-t border-white/[0.06] pt-2.5 text-[12px] gap-2">
                    <span className={clsx(
                      'font-semibold capitalize',
                      post.sentiment === 'NEGATIVE' ? 'text-[#ff6961]' : post.sentiment === 'POSITIVE' ? 'text-[#30d158]' : 'text-war-text-secondary'
                    )}>
                      Sentiment: {post.sentiment.toLowerCase()}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEscalateThreat(post.text.slice(0, 50), post.author, post.reachTier, post.platform, post.text)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#ff9f0a] hover:text-white transition"
                      >
                        <GIcon name="warning" size={12} />
                        <span>Escalate to Threat Vector</span>
                      </button>
                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#0a84ff] hover:underline font-medium"
                        >
                          <span>Inspect</span>
                          <GIcon name="arrow_outward" size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          /* Posts Feed */
          <div className="space-y-3">
            {filtered.map((post) => (
              <div key={post.id} className="glass-panel apple-card-hover p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold', platformColors[post.platform])}>
                      {post.platform.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold tracking-[-0.006em] text-white">{post.author}</div>
                      <div className="text-[12px] text-war-text-muted">{post.handle} · {post.followers} followers</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] tabular-nums text-war-text-muted">{post.time}</span>
                </div>

                <p className="mb-4 text-[14px] leading-relaxed text-war-text-secondary">{post.text}</p>

                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.03] p-3.5 sm:grid-cols-5">
                  <div>
                    <div className="metric-label">Engagement</div>
                    <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{post.engagement}</div>
                  </div>
                  <div>
                    <div className="metric-label">Reach</div>
                    <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{post.reach}</div>
                  </div>
                  <div>
                    <div className="metric-label">Sentiment</div>
                    <div className={clsx('mt-0.5 text-[13px] font-semibold capitalize', post.sentiment === 'NEGATIVE' ? 'text-[#ff6961]' : post.sentiment === 'POSITIVE' ? 'text-[#30d158]' : 'text-war-text-secondary')}>
                      {post.sentiment.toLowerCase()}
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">Risk</div>
                    <div className={clsx('mt-0.5 text-[14px] font-semibold tabular-nums', post.riskContribution > 70 ? 'text-[#ff6961]' : post.riskContribution > 40 ? 'text-[#ffb340]' : 'text-[#ffd60a]')}>
                      {post.riskContribution}
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">Narrative</div>
                    <div className="mt-0.5 truncate text-[13px] text-war-text-secondary" title={post.narrative}>{post.narrative}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end border-t border-white/[0.06] pt-2.5">
                  <button
                    onClick={() => handleEscalateThreat(post.text.slice(0, 50), post.author, post.reach, post.platform, post.text)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffb340] transition hover:bg-[#ff9f0a]/20 hover:text-white"
                  >
                    <GIcon name="warning" size={12} />
                    <span>Escalate to Threat Vector</span>
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="glass-panel flex flex-col items-center gap-2 p-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07]">
                  <GIcon name="search_off" size={20} className="text-war-text-muted" />
                </span>
                <p className="text-[14px] text-war-text-muted">No posts for this platform yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Reach Doctor Channel Diagnostics Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#12141a] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#30d158]" />
                  <h3 className="text-[18px] font-bold text-white">Agent Reach Doctor Diagnostics</h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white">v1.5.0</span>
                </div>
                <p className="mt-1 text-[13px] text-war-text-secondary">
                  15 Platforms monitored with automated backend routing. Zero API fees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDoctorModal(false)}
                className="rounded-lg p-1.5 text-war-text-muted hover:bg-white/10 hover:text-white"
              >
                <GIcon name="close" size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {doctorData?.channels.map((ch) => (
                <div
                  key={ch.key}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-white">{ch.name}</span>
                      {ch.activeBackend && (
                        <span className="rounded bg-[#0a84ff]/20 px-2 py-0.5 text-[10px] font-mono text-[#0a84ff]">
                          {ch.activeBackend}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-war-text-muted truncate">{ch.message || 'Ready for queries'}</p>
                  </div>

                  <span className={clsx(
                    'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                    ch.status === 'ok' ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30' : ch.status === 'warn' ? 'bg-[#ff9f0a]/20 text-[#ffb340] border border-[#ff9f0a]/30' : 'bg-white/10 text-war-text-muted'
                  )}>
                    {ch.status === 'ok' ? 'Active' : ch.status === 'warn' ? 'Optional' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[12px]">
              <span className="text-war-text-muted">
                Active Channels: <strong className="text-white">{doctorData?.activeChannelsCount ?? 4}</strong> of {doctorData?.totalChannelsCount ?? 15}
              </span>
              <button
                type="button"
                onClick={async () => {
                  setIsDoctorLoading(true);
                  const res = await api.getAgentReachDoctor(true);
                  setDoctorData(res);
                  setIsDoctorLoading(false);
                }}
                disabled={isDoctorLoading}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 font-medium text-white transition hover:bg-white/20"
              >
                <GIcon name="refresh" size={13} className={isDoctorLoading ? 'animate-spin' : ''} />
                <span>Re-check Doctor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
