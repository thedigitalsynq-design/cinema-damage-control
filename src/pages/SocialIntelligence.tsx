import { useState } from 'react';
import { clsx } from 'clsx';
import { socialPosts, platformData } from '../data/mockData';

const platformColors: Record<string, string> = {
  X: 'bg-white text-black',
  INSTAGRAM: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
  YOUTUBE: 'bg-red-500 text-white',
  REDDIT: 'bg-orange-500 text-white',
  FACEBOOK: 'bg-[#0a84ff] text-white',
};

export function SocialIntelligence() {
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const tabs = ['ALL', 'X', 'INSTAGRAM', 'YOUTUBE', 'REDDIT', 'FACEBOOK'];
  const filtered = activeTab === 'ALL' ? socialPosts : socialPosts.filter((p) => p.platform === activeTab);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Social</h1>
          <p className="apple-subhead mt-1">Platform-level monitoring for Project Veera.</p>
        </div>

        {/* Platform Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {platformData.map((p) => (
            <div key={p.platform} className="glass-panel apple-card-hover p-4 text-center">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">{p.platform.toLowerCase()}</div>
              <div className="text-[20px] font-bold tabular-nums tracking-tight text-white">{(p.mentions / 1000).toFixed(0)}K</div>
              <div className="text-[12px] text-war-text-muted">mentions</div>
              <div className={clsx('mt-1 text-[13px] font-semibold tabular-nums', p.sentiment < -30 ? 'text-[#ff6961]' : p.sentiment < -10 ? 'text-[#ffb340]' : 'text-[#ffd60a]')}>
                {p.sentiment}%
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

        {/* Posts Feed */}
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
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="glass-panel p-10 text-center text-[14px] text-war-text-muted">No posts for this platform yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
