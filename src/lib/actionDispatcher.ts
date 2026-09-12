import { logUserActivity } from './activityLog';
import type { ActivityLogEntry } from './activityLog';
import { updateLeakStatusInFirestore } from './firestoreSync';
import type { Incident, LeakLink } from '../data/types';

export type ActionCategory =
  | 'INCIDENT'
  | 'COUNTERMEASURE'
  | 'TAKEDOWN'
  | 'PLAYBOOK'
  | 'MARKET'
  | 'REPORT'
  | 'RECOVERY'
  | 'SYSTEM'
  | 'LEAK';

export interface DispatchedAction {
  id: string;
  type: string;
  category: ActionCategory;
  title: string;
  details: string;
  payload?: any;
  metadata?: any;
  timestamp: string;
  sourceTabId: string;
}

// Global tab ID to avoid self-echoing
const CURRENT_TAB_ID = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

type ActionListener = (action: DispatchedAction) => void;
const listeners = new Set<ActionListener>();

let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel('cinema_war_room_live_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'ACTION_DISPATCHED' && event.data.action) {
        const action: DispatchedAction = event.data.action;
        if (action.sourceTabId !== CURRENT_TAB_ID) {
          listeners.forEach((listener) => {
            try {
              listener(action);
            } catch (err) {
              console.error('Action listener error:', err);
            }
          });
        }
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel initialization warning:', err);
  }
}

/**
 * Register a listener for synchronized actions across tabs and local triggers
 */
export function subscribeToActions(listener: ActionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const onActionDispatched = subscribeToActions;

/**
 * Internal core dispatcher
 */
export function dispatchAction(
  type: string,
  category: ActionCategory,
  title: string,
  details: string,
  payload?: any
): DispatchedAction {
  const action: DispatchedAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    category,
    title,
    details,
    payload,
    metadata: payload,
    timestamp: new Date().toISOString(),
    sourceTabId: CURRENT_TAB_ID,
  };

  // Broadcast to other tabs
  if (channel) {
    try {
      channel.postMessage({
        type: 'ACTION_DISPATCHED',
        action,
      });
    } catch (err) {
      console.warn('Broadcast postMessage error:', err);
    }
  }

  // Notify local listeners
  listeners.forEach((listener) => {
    try {
      listener(action);
    } catch (err) {
      console.error('Local action listener error:', err);
    }
  });

  // Persist to Firestore activity logs
  const activityCategory: ActivityLogEntry['category'] =
    category === 'TAKEDOWN' || category === 'LEAK'
      ? 'TAKEDOWN'
      : category === 'COUNTERMEASURE' || category === 'PLAYBOOK'
      ? 'COUNTERMEASURE'
      : category === 'INCIDENT'
      ? 'INCIDENT'
      : category === 'REPORT'
      ? 'REPORT'
      : category === 'MARKET' || category === 'RECOVERY'
      ? 'INTERVENTION'
      : 'SYSTEM';

  logUserActivity(title, activityCategory, details).catch((err) => {
    console.warn('Background activity logging notice:', err);
  });

  return action;
}

/**
 * High-Level Action Helpers
 */

export async function dispatchResolveIncident(
  incidentId: string,
  incidentTitle: string
): Promise<DispatchedAction> {
  return dispatchAction(
    'RESOLVE_INCIDENT',
    'INCIDENT',
    `Resolved Incident: ${incidentTitle}`,
    `Marked incident [${incidentId}] as neutralized. Risk pressure relieved.`,
    { incidentId }
  );
}

export async function dispatchCreateIncident(
  incident: Partial<Incident>
): Promise<DispatchedAction> {
  return dispatchAction(
    'CREATE_INCIDENT',
    'INCIDENT',
    `New Threat Vector Logged: ${incident.title}`,
    `Severity: ${incident.severity || 'MEDIUM'} · Est. Reach: ${incident.reach || 'N/A'} · Recommendation: ${incident.recommendation || 'Standard containment'}`,
    { incident }
  );
}

export async function dispatchLeakTakedown(
  leakOrId: Partial<LeakLink> | { id: string; platform?: string; status?: string } | string,
  urlOrStatus?: string,
  statusArg?: 'TAKEDOWN_SENT' | 'REMOVED' | string
): Promise<DispatchedAction> {
  let leakId = 'unknown';
  let targetStatus: 'TAKEDOWN_SENT' | 'REMOVED' = 'TAKEDOWN_SENT';
  let targetUrl = '';

  if (typeof leakOrId === 'string') {
    leakId = leakOrId;
    targetUrl = urlOrStatus || leakOrId;
    targetStatus = (statusArg as any) || 'TAKEDOWN_SENT';
  } else {
    leakId = leakOrId.id || 'unknown';
    targetStatus = (urlOrStatus as any) || (leakOrId.status as any) || 'TAKEDOWN_SENT';
    targetUrl = (leakOrId as any).url || leakId;
  }

  // Persist directly to Firestore
  updateLeakStatusInFirestore(leakId, targetStatus).catch((e) =>
    console.warn('Leak update in firestore:', e)
  );

  const title =
    targetStatus === 'REMOVED'
      ? `Piracy Link Neutralized (${targetUrl.slice(0, 30)})`
      : `DMCA Notice Dispatched (${targetUrl.slice(0, 30)})`;

  return dispatchAction(
    'TAKEDOWN_LEAK',
    'TAKEDOWN',
    title,
    `Target URL [${targetUrl}] updated to status: ${targetStatus}`,
    { leakId, url: targetUrl, status: targetStatus, newStatus: targetStatus }
  );
}

export async function dispatchCountermeasure(
  type: string,
  filmTitle: string,
  statementPreview: string
): Promise<DispatchedAction> {
  const labelMap: Record<string, string> = {
    press_release: 'Studio Clarification Press Release',
    piracy_dmca: 'Section 51 Copyright Takedown Wave',
    exhibitor_memo: 'Exhibitor Retention Incentive Bulletin',
    critic_advisory: 'Key Influencer & Critic Advisory',
  };
  const label = labelMap[type] || 'Rapid Crisis Countermeasure';

  return dispatchAction(
    'DISPATCH_COUNTERMEASURE',
    'COUNTERMEASURE',
    `${label} Dispatched`,
    `Project: "${filmTitle}" · Dispatched to verified media desks and trade partners: ${statementPreview.substring(0, 120)}...`,
    { type, filmTitle }
  );
}

export async function dispatchPlaybookExecution(
  playbookName: string,
  objective: string,
  filmTitle: string
): Promise<DispatchedAction> {
  return dispatchAction(
    'EXECUTE_PLAYBOOK',
    'PLAYBOOK',
    `Playbook Executed: ${playbookName}`,
    `Target: ${filmTitle} · Objective: ${objective} · Immediate mitigation protocol active.`,
    { playbookName, objective, filmTitle }
  );
}

export async function dispatchMarketIntervention(
  region: string,
  language: string,
  filmTitle: string,
  actionType: string
): Promise<DispatchedAction> {
  return dispatchAction(
    'MARKET_INTERVENTION',
    'MARKET',
    `Regional Intervention: ${region} (${language})`,
    `Deployed ${actionType} for "${filmTitle}" to reinforce theatre occupancy and exhibitor retention.`,
    { region, language, filmTitle, actionType }
  );
}

export async function dispatchReportExport(
  reportTitle: string,
  filmTitle: string
): Promise<DispatchedAction> {
  return dispatchAction(
    'EXPORT_REPORT',
    'REPORT',
    `Report Exported: ${reportTitle}`,
    `Dossier for "${filmTitle}" exported in Markdown format for C-Suite distribution.`,
    { reportTitle, filmTitle }
  );
}

export const dispatchExportReport = dispatchReportExport;
