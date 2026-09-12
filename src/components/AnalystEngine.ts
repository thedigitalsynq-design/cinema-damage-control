/**
 * Analyst engine: free keyless AI (Pollinations) with a deterministic
 * offline fallback, plus an action protocol so answers can DO things
 * in the room: [ACTION:goto:/response] [ACTION:phase:opening]
 * [ACTION:refresh] [ACTION:export]
 */

export interface AgentAction {
  kind: 'goto' | 'phase' | 'refresh' | 'export';
  arg: string;
  label: string;
}

export interface AnalystReply {
  text: string;
  actions: AgentAction[];
  engine: 'ai' | 'local';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const ACTION_RE = /\[ACTION:([a-z]+)(?::([^\]]+))?\]/g;

const ACTION_LABELS: Record<string, (arg: string) => string> = {
  goto: (arg) => `Open ${arg}`,
  phase: (arg) => `Switch to ${arg}`,
  refresh: () => 'Refresh live feed',
  export: () => 'Export brief',
};

export function parseActions(raw: string): { text: string; actions: AgentAction[] } {
  const actions: AgentAction[] = [];
  const text = raw
    .replace(ACTION_RE, (_m, kind: string, arg = '') => {
      const k = kind as AgentAction['kind'];
      if (k === 'goto' || k === 'phase' || k === 'refresh' || k === 'export') {
        actions.push({ kind: k, arg: arg.trim(), label: ACTION_LABELS[k](arg.trim()) });
      }
      return '';
    })
    .trim();
  return { text, actions };
}

const SYSTEM_PROMPT = `You are the damage-control analyst inside the Cinema Damage Control Room tracking the film named in DATA. A DATA snapshot follows.
Rules: answer concisely (120 words max), cite the numbers, never invent figures beyond DATA, mark estimates as estimates.
You can trigger real app actions by appending tokens on their own at the end, e.g. [ACTION:phase:opening] [ACTION:goto:/response].
Allowed actions — goto:<path among /, /signals, /incidents, /leaks, /response, /recovery, /reports>, phase:<pre|opening|recovery>, refresh, export.
Only attach actions that directly serve the answer (max 2). Plain discussion needs none.`;

async function askFreeAI(snapshot: string, history: ChatMessage[], question: string): Promise<string | null> {
  // First try the internal Gemini backend route
  try {
    const geminiRes = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        systemInstruction: `${SYSTEM_PROMPT}\n\nDATA:\n${snapshot}`,
        history: history.slice(-6).map((m) => ({
          role: m.role,
          content: m.text,
        })),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (geminiRes.ok) {
      const data = await geminiRes.json();
      if (data && data.success && typeof data.text === 'string' && data.text.trim()) {
        return data.text.trim();
      }
    }
  } catch {
    // Fallthrough to external AI / local deterministic engine
  }

  // Second try: free provider
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\nDATA:\n${snapshot}` },
          ...history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
          { role: 'user', content: question },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

export interface RoomSnapshot {
  film: string;
  phase: string;
  mode: string;
  updated: string;
  total: number;
  negPct: number;
  posPct: number;
  velocityPct: number;
  reach: string;
  trending: string;
  activeIncidents: number;
  topIncidents: string;
  activeLeaks: number;
  signals: number;
  readiness: string;
  interventions: string;
}

/** Deterministic offline analyst: real answers computed from the snapshot, no network. */
export function localAnalyst(snapshot: RoomSnapshot, question: string): string {
  const q = question.toLowerCase();
  const verdict =
    snapshot.negPct >= 70 ? 'critical — most coverage is hostile'
    : snapshot.negPct >= 50 ? 'elevated — negativity leads the conversation'
    : snapshot.negPct >= 30 ? 'guarded — negativity present but not dominant'
    : 'stable — coverage leans neutral-to-positive';

  if (/brief|morning|summary|status|overview/.test(q)) {
    return [
      `Room brief (${snapshot.mode}, updated ${snapshot.updated}): ${snapshot.total} stories tracked, ${snapshot.negPct}% negative — verdict ${verdict}.`,
      `Velocity ${snapshot.velocityPct >= 0 ? '+' : ''}${snapshot.velocityPct}% hour-over-hour; reach ${snapshot.reach}; top terms: ${snapshot.trending}.`,
      `${snapshot.activeIncidents} active incidents, ${snapshot.activeLeaks} active leaks, readiness ${snapshot.readiness}, interventions ${snapshot.interventions}.`,
      `Suggested next step below. [ACTION:goto:/response]`,
    ].join(' ');
  }
  if (/risk|worry|danger|threat|bad/.test(q)) {
    return `Biggest risk right now: ${snapshot.negPct}% negative share across ${snapshot.total} stories (${verdict}). Velocity is ${snapshot.velocityPct >= 0 ? '+' : ''}${snapshot.velocityPct}% hour-over-hour. Top incidents: ${snapshot.topIncidents}. I suggest opening the response queue. [ACTION:goto:/response]`;
  }
  if (/trend|talk|saying|narrative|hashtag/.test(q)) {
    return `Conversation drivers: ${snapshot.trending}. ${snapshot.posPct}% of stories read positive. Watch whether any single term crosses a third of mentions — that is when a narrative hardens. [ACTION:goto:/narratives]`;
  }
  if (/leak|pirat|torrent|download/.test(q)) {
    return `${snapshot.activeLeaks} pirated links are actively tracked. Every hour a 1080p+ print stays up costs opening-week revenue — clear the queue oldest-first. [ACTION:goto:/leaks]`;
  }
  if (/do|action|recommend|suggest|next|plan/.test(q)) {
    return `Recommended sequence: 1) triage the ${snapshot.activeIncidents} active incidents, 2) clear takedowns (${snapshot.activeLeaks} active leaks), 3) refresh the feed to confirm movement. [ACTION:goto:/incidents] [ACTION:refresh]`;
  }
  if (/phase|release|stage/.test(q)) {
    return `Room is in ${snapshot.phase} phase. Pre-release buys options, opening week spends them fast, recovery runs on schedule. Switch phase when the calendar turns. [ACTION:phase:opening]`;
  }
  if (/export|report|brief|download|share/.test(q)) {
    return `I can take you to the export desk — the 60-second brief downloads as Markdown. [ACTION:export]`;
  }
  if (/sentiment|positive|negative|feel/.test(q)) {
    return `Sentiment across ${snapshot.total} stories: ${snapshot.negPct}% negative, ${snapshot.posPct}% positive (keyword-classified English headlines; regional scripts read neutral). Trend matters more than the level — compare with the last hour. [ACTION:goto:/signals]`;
  }
  return `I can brief the room, call out the biggest risk, track narratives and leaks, recommend next actions, or export the brief. Try "morning brief" or ask about a specific metric — I read live numbers when the backend runs, simulation otherwise (${snapshot.mode}).`;
}

export async function analystAnswer(
  snapshot: RoomSnapshot,
  history: ChatMessage[],
  question: string
): Promise<AnalystReply> {
  const snapText = [
    `film=${snapshot.film} phase=${snapshot.phase} mode=${snapshot.mode} updated=${snapshot.updated}`,
    `stories=${snapshot.total} neg=${snapshot.negPct}% pos=${snapshot.posPct}% velocity=${snapshot.velocityPct}% reach=${snapshot.reach}`,
    `trending=[${snapshot.trending}] incidents=${snapshot.activeIncidents} (${snapshot.topIncidents}) leaks=${snapshot.activeLeaks} signals=${snapshot.signals} readiness=${snapshot.readiness} interventions=${snapshot.interventions}`,
  ].join('\n');

  const ai = await askFreeAI(snapText, history, question);
  if (ai) {
    const { text, actions } = parseActions(ai);
    return { text, actions, engine: 'ai' };
  }
  const local = localAnalyst(snapshot, question);
  const { text, actions } = parseActions(local);
  return { text, actions, engine: 'local' };
}
