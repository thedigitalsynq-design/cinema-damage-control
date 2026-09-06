import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import { useLiveData } from '../hooks/useLiveData';
import { estimateSentiment } from '../data/apiService';
import { useToast } from '../components/Toaster';
import { useProject } from '../components/ProjectContext';

function downloadMarkdown(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const reports = [
  {
    id: 'exec-brief',
    title: 'Executive summary',
    subtitle: 'The 60-second brief',
    description: 'Concise summary for leadership. What happened, why it matters, and what to do.',
    lastGenerated: '2 minutes ago',
    severity: 'CRITICAL',
  },
  {
    id: 'incident-report',
    title: 'Incident report',
    subtitle: 'CW-042 · Lead Actor Controversy',
    description: 'Full incident analysis with timeline, evidence, and response status.',
    lastGenerated: '8 minutes ago',
    severity: 'CRITICAL',
  },
  {
    id: 'media-report',
    title: 'Media report',
    subtitle: 'Coverage analysis',
    description: 'Media coverage breakdown, sentiment analysis, and narrative flow.',
    lastGenerated: '12 minutes ago',
    severity: 'HIGH',
  },
  {
    id: 'crisis-timeline',
    title: 'Crisis timeline',
    subtitle: 'Full event chronology',
    description: 'Complete timeline of events from first detection to current state.',
    lastGenerated: '5 minutes ago',
    severity: 'HIGH',
  },
];

const toxicBrief = {
  whatHappened: 'Yash-starrer Toxic: A Fairy Tale for Grown-Ups (dir. Geetu Mohandas) released worldwide on August 26, 2026 in Kannada plus Hindi, Tamil, Telugu and Malayalam dubs. After a ₹140 crore worldwide opening day, momentum softened — ~₹322 crore in 8 days against blockbuster expectations. On September 4 the makers released a shorter English cut (2h57m vs 3h14m) in India alongside Mirzapur: The Movie, resetting the conversation around runtime and reception.',
  whyItMatters: 'Toxic is Yash\'s first release since KGF: Chapter 2 and a test of the pan-India gangster epic. The underperformance narrative now dominates coverage and threatens satellite, OTT and brand outcomes. The English-cut release is a second opening — its reception will set the final story.',
  topNarratives: [
    'Box-office underperformance — 38% of conversation',
    'English shorter-cut reset — 24% of conversation',
    'Yash comeback scrutiny — 19% of conversation',
  ],
  topActions: [
    'Amplify English-cut word-of-mouth within 48 hours of release',
    'Seed behind-the-scenes craft coverage to shift from numbers to filmmaking',
    'Brief Yash and Geetu Mohandas with two aligned talking points each',
  ],
  ifNoAction: 'The flop narrative hardens into consensus before the OTT window. Estimated reputational drag on Yash\'s next announcement and 15–20% weaker ancillary deals.',
};

interface Brief {
  whatHappened: string;
  whyItMatters: string;
  topNarratives: string[];
  topActions: string[];
  ifNoAction: string;
  live: boolean;
}

function buildBrief(
  project: { id: string; title: string },
  stats: { total: number; negPct: number; posPct: number; velocityPct: number; reachLabel: string; trending: { term: string; mentions: number }[] } | null,
  isLive: boolean
): Brief {
  if (isLive && stats) {
    const terms = stats.trending.slice(0, 3).map((t) => `${t.term} — ${t.mentions} stories`);
    return {
      whatHappened: `${stats.total} stories tracked for ${project.title}: ${stats.negPct}% read negative, ${stats.posPct}% positive, volume ${stats.velocityPct >= 0 ? '+' : ''}${stats.velocityPct}% day-over-day with an estimated ${stats.reachLabel} reach.`,
      whyItMatters: `Narrative momentum for ${project.title} is being set right now — the dominant terms (${terms[0] || 'forming'}) will frame the next 48 hours of coverage.`,
      topNarratives: terms.length > 0 ? terms : ['Coverage too thin to mine narratives yet'],
      topActions: [
        'Amplify the strongest positive story within 24 hours',
        'Prepare a factual clarification for the top negative term',
        'Brief one authorized spokesperson before the next cycle',
      ],
      ifNoAction: 'The leading negative term hardens into the consensus story for this title.',
      live: true,
    };
  }
  if (project.id === 'toxic') return { ...toxicBrief, live: false };
  return {
    whatHappened: `${project.title} is under tracking. Start the backend to replace this simulation brief with measured coverage.`,
    whyItMatters: 'Without live data every number on this page is illustrative.',
    topNarratives: ['Simulation narrative A — illustrative', 'Simulation narrative B — illustrative'],
    topActions: ['Start the backend (`npm run server`)', 'Confirm keyword coverage for this title', 'Set the release phase in the top bar'],
    ifNoAction: 'Decisions made on simulation data stay simulation decisions.',
    live: false,
  };
}

export function Reports() {
  const toast = useToast();
  const { project } = useProject();
  const { news: liveNews, stats: briefStats, isLive: briefLive, lastUpdated: liveUpdated, isLoading: liveLoading } = useLiveData(project.keywords.join(','));
  const liveOk = briefLive && !!briefStats;
  const brief = buildBrief(project, briefStats, liveOk);

  const exportBrief = () => {
    const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const md = [
      `# 60-Second Brief — ${project.title}${brief.live ? '' : ' (simulation)'}`,
      `_Cinema Damage Control Room · generated ${stamp}_`,
      ``,
      `## What happened?`,
      brief.whatHappened,
      ``,
      `## Why it matters`,
      brief.whyItMatters,
      ``,
      `## What is driving it?`,
      ...brief.topNarratives.map((n) => `- ${n}`),
      ``,
      `## What should we do?`,
      ...brief.topActions.map((a, i) => `${i + 1}. ${a}`),
      ``,
      `## What happens if we do nothing?`,
      brief.ifNoAction,
    ].join('\n');
    downloadMarkdown(`${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-60-second-brief.md`, md);
    toast('Brief downloaded as Markdown', 'success');
  };

  const exportReport = (id: string, title: string, subtitle: string, description: string) => {
    const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const md = [
      `# ${title} — ${project.title}`,
      `_${subtitle} · Cinema Damage Control Room · generated ${stamp}_`,
      ``,
      description,
      ``,
      `## Current situation`,
      brief.whatHappened,
      ``,
      `## Recommended actions`,
      ...brief.topActions.map((a, i) => `${i + 1}. ${a}`),
    ].join('\n');
    downloadMarkdown(`${id}.md`, md);
    toast(`“${title}” downloaded as Markdown`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Reports</h1>
          <p className="apple-subhead mt-1">Briefs and exports for {project.title}.</p>
        </div>

        {/* Executive Brief Preview */}
        <div className="glass-panel p-6 lg:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="section-title">The 60-second brief</span>
              <p className="mt-1 text-[12px] tabular-nums text-war-text-muted">Last updated 34 seconds ago</p>
            </div>
            <button
              onClick={exportBrief}
              className="apple-button flex items-center gap-1.5 bg-[#0a84ff] px-4 py-2 text-[14px] text-white hover:bg-[#409cff]"
            >
              <GIcon name="download" size={14} /> Export
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="section-title mb-1.5">What happened?</h3>
              <p className="max-w-[900px] text-[14px] leading-relaxed text-war-text-secondary">{brief.whatHappened}</p>
            </div>
            <div>
              <h3 className="section-title mb-1.5">Why it matters</h3>
              <p className="max-w-[900px] text-[14px] leading-relaxed text-war-text-secondary">{brief.whyItMatters}</p>
            </div>
            <div>
              <h3 className="section-title mb-2">What is driving it?</h3>
              <ul className="space-y-1.5">
                {brief.topNarratives.map((n, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[14px] text-war-text-secondary">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff453a]" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="section-title mb-2">What should we do?</h3>
              <ol className="space-y-2">
                {brief.topActions.map((a, i) => (
                  <li key={i} className="flex max-w-[900px] items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/20 text-[12px] font-semibold text-[#64a8ff]">
                      {i + 1}
                    </span>
                    <span className="text-[14px] text-war-text-secondary">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-[#ff9f0a]/25 bg-[#ff9f0a]/10 p-4">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#ffb340]">What happens if we do nothing?</h3>
              <p className="text-[14px] leading-relaxed text-war-text-secondary">{brief.ifNoAction}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] font-medium text-war-text-muted">Current status</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff453a]/15 px-3 py-1 text-[12px] font-semibold text-[#ff6961]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff453a]" /> Critical
              </span>
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="section-title">Available reports</span>
            <span className="apple-footnote">{reports.length} templates</span>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {reports.map((report) => (
              <div key={report.id} className="flex items-start gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.05]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07]">
                  <GIcon name="description" size={18} className="text-war-text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold tracking-[-0.006em] text-white">{report.title}</span>
                    <span className={clsx(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      report.severity === 'CRITICAL' ? 'bg-[#ff453a]/15 text-[#ff6961]' : 'bg-[#ff9f0a]/15 text-[#ffb340]'
                    )}>{report.severity.toLowerCase()}</span>
                  </div>
                  <p className="text-[12px] text-war-text-muted">{report.subtitle}</p>
                  <p className="mb-2.5 mt-1 text-[13px] leading-relaxed text-war-text-secondary">{report.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-war-text-muted">
                      <GIcon name="schedule" size={12} /> {report.lastGenerated}
                    </span>
                    <button
                      onClick={() => exportReport(report.id, report.title, report.subtitle, report.description)}
                      className="apple-button flex items-center gap-1 bg-white/10 px-3 py-1.5 text-[13px] text-white hover:bg-white/15"
                    >
                      <GIcon name="download" size={12} /> Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live News Feed */}
        <ReportsLiveSection news={liveNews} isLive={liveOk} lastUpdated={liveUpdated} isLoading={liveLoading} />
      </div>
    </div>
  );
}

function ReportsLiveSection({ news, isLive, lastUpdated, isLoading }: {
  news: { title: string; link: string; pubDate: string; source: string }[];
  isLive: boolean;
  lastUpdated: string;
  isLoading: boolean;
}) {

  if (isLoading) {
    return (
      <div className="glass-panel p-5">
        <div className="section-title mb-3">Live entertainment news</div>
        <div className="flex items-center justify-center gap-2.5 py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-[#0a84ff]" />
          <span className="text-[13px] text-war-text-muted">Fetching live news…</span>
        </div>
      </div>
    );
  }

  if (news.length === 0) return null;

  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="section-title">Live entertainment news</span>
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#30d158]/15 px-2.5 py-1">
              <GIcon name="radio" size={10} className="text-[#30d158] status-pulse" />
              <span className="text-[11px] font-semibold text-[#30d158]">Live</span>
            </span>
          )}
        </div>
        <span className="text-[12px] tabular-nums text-war-text-muted">
          {lastUpdated && `Updated ${new Date(lastUpdated).toLocaleTimeString('en-IN')}`}
        </span>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto">
        {news.slice(0, 15).map((item, i) => {
          const sentiment = estimateSentiment(item.title);
          return (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug text-white transition-colors group-hover:text-[#64a8ff]">
                  {item.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[12px] text-war-text-muted">{item.source || 'News'}</span>
                  {item.pubDate && (
                    <span className="text-[12px] tabular-nums text-war-text-muted">
                      {new Date(item.pubDate).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </span>
                  )}
                  <span className={clsx(
                    'text-[12px] font-semibold capitalize',
                    sentiment === 'NEGATIVE' && 'text-[#ff6961]',
                    sentiment === 'POSITIVE' && 'text-[#30d158]',
                    sentiment === 'NEUTRAL' && 'text-war-text-secondary'
                  )}>
                    {sentiment.toLowerCase()}
                  </span>
                </div>
              </div>
              <GIcon name="open_in_new" size={14} className="mt-1 shrink-0 text-war-text-muted opacity-0 transition group-hover:opacity-100" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
