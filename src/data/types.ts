export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'ACTIVE' | 'INVESTIGATING' | 'RESPONDING' | 'MONITORING' | 'RESOLVED';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type ConfidenceLevel = 'OBSERVED' | 'INFERRED' | 'ESTIMATED' | 'AI-GENERATED' | 'UNVERIFIED';

export interface Film {
  id: string;
  title: string;
  genre: string;
  languages: string[];
  releaseDate: string;
  status: 'PRE-RELEASE' | 'RELEASED' | 'POST-RELEASE';
}

export interface CrisisScore {
  overall: number;
  sentiment: number;
  velocity: number;
  reach: number;
  authority: number;
  coordination: number;
  persistence: number;
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  severity: Severity;
  type: 'VIRAL_POST' | 'NEWS_ALERT' | 'INFLUENCER_SPIKE' | 'HASHTAG' | 'SENTIMENT_SHIFT' | 'MISINFORMATION' | 'AUDIENCE_SHIFT' | 'INCIDENT';
  source?: string;
  reach?: string;
  confidence?: number;
}

export interface Incident {
  id: string;
  code: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  firstDetected: string;
  velocity: string;
  reach: string;
  sentiment: number;
  authorityScore: number;
  owner: string;
  recommendation: string;
  whatWeKnow: string;
  whatWeDontKnow: string[];
  recommendedActions: string[];
}

export interface Signal {
  id: string;
  type: 'VIRAL_POST' | 'NEWS_ALERT' | 'INFLUENCER_SPIKE' | 'HASHTAG' | 'SENTIMENT_SHIFT' | 'MISINFORMATION' | 'AUDIENCE_SHIFT';
  title: string;
  source: string;
  time: string;
  velocity: string;
  reach: string;
  sentiment: Sentiment;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
}

export interface Narrative {
  id: string;
  title: string;
  share: number;
  sentiment: Sentiment;
  velocity: string;
  posts: number;
  influencers: number;
  hashtags: string[];
  origin: string;
  amplifiers: string[];
  audience: string;
  geography: string;
  timeline: string;
  evidence: string[];
}

export interface SocialPost {
  id: string;
  platform: 'X' | 'INSTAGRAM' | 'YOUTUBE' | 'REDDIT' | 'FACEBOOK';
  author: string;
  handle: string;
  followers: string;
  text: string;
  engagement: string;
  reach: string;
  sentiment: Sentiment;
  riskContribution: number;
  time: string;
  narrative: string;
}

export interface MediaStory {
  id: string;
  publication: string;
  headline: string;
  timestamp: string;
  reach: string;
  sentiment: Sentiment;
  narrative: string;
  influence: number;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  category: 'ACTOR' | 'CREATOR' | 'JOURNALIST' | 'CRITIC' | 'FAN_ACCOUNT' | 'POLITICAL_FIGURE' | 'ENTERTAINMENT_PAGE';
  audience: string;
  engagement: string;
  sentiment: Sentiment;
  reach: string;
  narrative: string;
  influenceScore: number;
}

export interface ResponsePlan {
  id: string;
  incidentId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  strategy: string;
  channel: string;
  tone: string;
  draft: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  time: string;
  read: boolean;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

export type LeakStatus = 'ACTIVE' | 'TAKEDOWN_SENT' | 'REMOVED';
export type LeakPlatform = 'STREAMING' | 'TORRENT' | 'TELEGRAM' | 'FILE_HOST' | 'SOCIAL';

export interface LeakLink {
  id: string;
  host: string;
  url: string;
  platform: LeakPlatform;
  quality: 'CAM' | 'HDTS' | 'HDTC' | 'HD' | '1080P' | '4K';
  threat: Severity;
  detected: string;
  views: string;
  status: LeakStatus;
  statusUpdated: string;
}
