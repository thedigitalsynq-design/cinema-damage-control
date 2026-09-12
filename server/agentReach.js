import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execFileAsync = promisify(execFile);

// Resolve Agent Reach CLI binary from virtualenv or PATH
function getAgentReachBinary() {
  const home = os.homedir();
  const winPath = path.join(home, '.agent-reach-venv', 'Scripts', 'agent-reach.exe');
  const posixPath = path.join(home, '.agent-reach-venv', 'bin', 'agent-reach');

  if (process.platform === 'win32' && fs.existsSync(winPath)) {
    return winPath;
  }
  if (fs.existsSync(posixPath)) {
    return posixPath;
  }
  return 'agent-reach';
}

// In-memory cache for doctor status to avoid spawning processes repeatedly
let doctorCache = {
  data: null,
  timestamp: 0,
};
const DOCTOR_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Runs `agent-reach doctor --json` to diagnose status of all 15 channels.
 */
export async function getDoctorStatus(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && doctorCache.data && now - doctorCache.timestamp < DOCTOR_CACHE_TTL) {
    return { ...doctorCache.data, cached: true };
  }

  const binary = getAgentReachBinary();
  try {
    const { stdout } = await execFileAsync(binary, ['doctor', '--json'], {
      timeout: 12000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    const parsed = JSON.parse(stdout);
    const channels = Object.entries(parsed).map(([key, val]) => ({
      key,
      name: val.name || key,
      status: val.status || 'off', // 'ok' | 'warn' | 'off'
      message: val.message || '',
      backends: val.backends || [],
      activeBackend: val.active_backend || null,
      tier: val.tier ?? 1,
    }));

    const activeCount = channels.filter((c) => c.status === 'ok').length;
    const totalCount = channels.length;

    const result = {
      success: true,
      cached: false,
      timestamp: new Date().toISOString(),
      binaryPath: binary,
      activeChannelsCount: activeCount,
      totalChannelsCount: totalCount,
      channels,
      raw: parsed,
    };

    doctorCache = { data: result, timestamp: now };
    return result;
  } catch (err) {
    console.warn('[AgentReach] doctor CLI error, using baseline status:', err.message);
    // Baseline zero-config fallback
    const fallbackChannels = [
      { key: 'web', name: 'Web Reader (Any URL)', status: 'ok', activeBackend: 'Jina Reader', tier: 0, message: 'Clean markdown web reader active' },
      { key: 'bilibili', name: 'Bilibili Search & Video', status: 'ok', activeBackend: 'B站搜索 API', tier: 1, message: 'Direct search API available' },
      { key: 'v2ex', name: 'V2EX Discussion Stream', status: 'ok', activeBackend: 'V2EX API (public)', tier: 0, message: 'Public JSON feeds active' },
      { key: 'rss', name: 'RSS/Atom Feeds', status: 'ok', activeBackend: 'feedparser', tier: 0, message: 'RSS news aggregation active' },
      { key: 'reddit', name: 'Reddit Cinema Communities', status: 'warn', activeBackend: 'Reddit Public Syndication', tier: 1, message: 'Reddit search via public feeds' },
      { key: 'youtube', name: 'YouTube Video Intel', status: 'warn', activeBackend: 'Google Video Feed', tier: 0, message: 'YouTube discovery active' },
      { key: 'twitter', name: 'Twitter/X Syndication', status: 'warn', activeBackend: 'Public Syndication', tier: 1, message: 'Public mentions tracking active' },
    ];

    return {
      success: true,
      cached: true,
      isFallback: true,
      timestamp: new Date().toISOString(),
      binaryPath: binary,
      activeChannelsCount: fallbackChannels.filter(c => c.status === 'ok').length,
      totalChannelsCount: fallbackChannels.length,
      channels: fallbackChannels,
      error: err.message,
    };
  }
}

/**
 * Scrapes any web article, review portal, or social URL using Agent Reach's Jina Reader methodology.
 * Converts JavaScript-heavy pages and news sites into clean, ad-free Markdown with zero API fees.
 */
export async function scrapeUrlWithAgentReach(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error('Valid target URL required');
  }

  // Normalize URL
  let cleanUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  let markdown = '';
  let providerUsed = 'Agent-Reach (Jina Reader)';
  let title = '';

  // 1. Primary path: Jina Reader (https://r.jina.ai/<cleanUrl>)
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await fetch(jinaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CinemaDamageControl/2.0',
        'Accept': 'text/plain, text/markdown, */*',
        'X-With-Generated-Alt': 'true',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      markdown = await res.text();
      // Extract title from first markdown header if available
      const titleMatch = markdown.match(/^#\s+(.+)$/m) || markdown.match(/Title:\s*(.+)/i);
      if (titleMatch) title = titleMatch[1].trim();
    }
  } catch (jinaErr) {
    console.warn('[AgentReach] Jina Reader error, falling back to direct fetch:', jinaErr.message);
  }

  // 2. Fallback path: Direct HTTP fetch with clean text extraction
  if (!markdown || markdown.trim().length < 50) {
    providerUsed = 'Direct Fallback Extractor';
    const directRes = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!directRes.ok) {
      throw new Error(`Target returned HTTP ${directRes.status}`);
    }

    const html = await directRes.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    markdown = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract substantive sentences
  const cleanText = markdown.replace(/[#*`_[\]()]/g, ' ').replace(/\s+/g, ' ');
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
  const substantiveSentences = sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 35 && s.length < 300);

  // Cinema Damage Control signals & risk scoring
  const lower = cleanText.toLowerCase();
  const hasCensorIssues = /censor|cbfc|cut|certification|18\+|a certificate|violence|censor board|beeps|mute/i.test(lower);
  const hasPlagiarism = /plagiarism|copied|remake|rip off|stolen|infringement|copyright notice|legal notice/i.test(lower);
  const hasBoxOfficeDispute = /inflated|fake collection|corporate booking|producer figure|tracker dispute|sacnilk|tracktollywood|scam/i.test(lower);
  const hasFanWar = /troll|fan war|boycott|downvote|review bomb|hate campaign|paid review|agenda|bot attack/i.test(lower);
  const hasPiracyLeak = /leak|piracy|screener|camrip|telegram|torrent|download link|hdrip|pirated print/i.test(lower);

  let riskLevel = 'LOW';
  if (hasPiracyLeak || hasPlagiarism || (hasBoxOfficeDispute && hasFanWar)) {
    riskLevel = 'CRITICAL';
  } else if (hasCensorIssues || hasBoxOfficeDispute || hasFanWar) {
    riskLevel = 'HIGH';
  } else if (substantiveSentences.some((s) => /disappointing|flop|weak|misfire|boring|disaster/i.test(s))) {
    riskLevel = 'MEDIUM';
  }

  const sentiment = (hasFanWar || hasBoxOfficeDispute || hasPlagiarism || riskLevel === 'CRITICAL')
    ? 'NEGATIVE'
    : /blockbuster|record|superhit|masterpiece|phenomenal|unmissable|brilliant/i.test(lower)
    ? 'POSITIVE'
    : 'NEUTRAL';

  return {
    success: true,
    url: cleanUrl,
    title: title || 'Scraped Content',
    markdown: markdown.slice(0, 8000), // Cap payload size
    wordCount,
    sentiment,
    riskLevel,
    provider: providerUsed,
    signalsDetected: {
      censorOrCBFC: hasCensorIssues,
      plagiarismOrCopyright: hasPlagiarism,
      fakeCollectionsOrDispute: hasBoxOfficeDispute,
      fanWarOrReviewBomb: hasFanWar,
      piracyOrLeaks: hasPiracyLeak,
    },
    extractedClaims: substantiveSentences.slice(0, 5),
    summaryExcerpt: substantiveSentences.slice(0, 2).join(' ') || markdown.slice(0, 300),
    scrapedAt: new Date().toISOString(),
  };
}
