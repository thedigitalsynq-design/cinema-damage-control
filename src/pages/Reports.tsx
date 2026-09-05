import { clsx } from 'clsx';
import { FileText, Download, Clock, Radio, ExternalLink } from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { estimateSentiment } from '../data/apiService';
import { useToast } from '../components/Toaster';

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

const briefContent = {
  whatHappened: 'A 46-second edited interview clip featuring the lead actor began circulating on X at 18:47 IST. The clip, taken out of context, sparked immediate negative reaction. Within 60 minutes, the #BoycottVeera hashtag entered top 10 trending on X India. Multiple entertainment portals published critical articles, and negative sentiment accelerated from 24% to 78%.',
  whyItMatters: 'The controversy threatens the film\'s September 18 release. Current trajectory suggests potential box office impact of ₹80-120 crore if unaddressed. Brand partnerships and satellite rights may be affected.',
  topNarratives: [
    'Lead Actor Controversy — 34% of conversation',
    'Political Interpretation — 21% of conversation',
    'Film Quality Criticism — 18% of conversation',
  ],
  topActions: [
    'Release full unedited footage immediately',
    'Prepare and distribute factual clarification',
    'Brief authorized spokesperson',
  ],
  ifNoAction: 'Risk trajectory shows continued escalation. Estimated to cross 85/100 within 2 hours. Boycott narrative projected to reach 15M+ estimated reach by midnight.',
};

export function Reports() {
  const toast = useToast();

  const exportBrief = () => {
    const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const md = [
      `# 60-Second Brief — Project Veera`,
      `_Cinema Damage Control Room · generated ${stamp}_`,
      ``,
      `## What happened?`,
      briefContent.whatHappened,
      ``,
      `## Why it matters`,
      briefContent.whyItMatters,
      ``,
      `## What is driving it?`,
      ...briefContent.topNarratives.map((n) => `- ${n}`),
      ``,
      `## What should we do?`,
      ...briefContent.topActions.map((a, i) => `${i + 1}. ${a}`),
      ``,
      `## What happens if we do nothing?`,
      briefContent.ifNoAction,
    ].join('\n');
    downloadMarkdown('veera-60-second-brief.md', md);
    toast('Brief downloaded as Markdown', 'success');
  };

  const exportReport = (id: string, title: string, subtitle: string, description: string) => {
    const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const md = [
      `# ${title} — Project Veera`,
      `_${subtitle} · Cinema Damage Control Room · generated ${stamp}_`,
      ``,
      description,
      ``,
      `## Current situation`,
      briefContent.whatHappened,
      ``,
      `## Recommended actions`,
      ...briefContent.topActions.map((a, i) => `${i + 1}. ${a}`),
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
          <p className="apple-subhead mt-1">Briefs and exports for Project Veera.</p>
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
              <Download size={14} /> Export
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="section-title mb-1.5">What happened?</h3>
              <p className="max-w-[900px] text-[14px] leading-relaxed text-war-text-secondary">{briefContent.whatHappened}</p>
            </div>
            <div>
              <h3 className="section-title mb-1.5">Why it matters</h3>
              <p className="max-w-[900px] text-[14px] leading-relaxed text-war-text-secondary">{briefContent.whyItMatters}</p>
            </div>
            <div>
              <h3 className="section-title mb-2">What is driving it?</h3>
              <ul className="space-y-1.5">
                {briefContent.topNarratives.map((n, i) => (
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
                {briefContent.topActions.map((a, i) => (
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
              <p className="text-[14px] leading-relaxed text-war-text-secondary">{briefContent.ifNoAction}</p>
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
                  <FileText size={18} className="text-war-text-secondary" />
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
                      <Clock size={12} /> {report.lastGenerated}
                    </span>
                    <button
                      onClick={() => exportReport(report.id, report.title, report.subtitle, report.description)}
                      className="apple-button flex items-center gap-1 bg-white/10 px-3 py-1.5 text-[13px] text-white hover:bg-white/15"
                    >
                      <Download size={12} /> Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live News Feed */}
        <ReportsLiveSection />
      </div>
    </div>
  );
}

function ReportsLiveSection() {
  const { news, isLive, lastUpdated, isLoading } = useLiveData();

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
              <Radio size={10} className="text-[#30d158] status-pulse" />
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
              <ExternalLink size={14} className="mt-1 shrink-0 text-war-text-muted opacity-0 transition group-hover:opacity-100" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
