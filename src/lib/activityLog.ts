import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreSync';

export interface ActivityLogEntry {
  id?: string;
  action: string;
  category: 'COUNTERMEASURE' | 'TAKEDOWN' | 'AI_CHAT' | 'PHASE_CHANGE' | 'SEARCH' | 'SYSTEM' | 'INCIDENT' | 'REPORT' | 'INTERVENTION';
  details: string;
  userId?: string;
  userEmail?: string;
  timestamp?: any;
  createdAt: string;
}

/**
 * Log a user interaction to Firestore (activity_logs collection)
 */
export async function logUserActivity(
  action: string,
  category: ActivityLogEntry['category'],
  details: string
): Promise<void> {
  const path = 'activity_logs';
  try {
    const currentUser = auth.currentUser;
    const entry = {
      action,
      category,
      details,
      userId: currentUser?.uid || 'anonymous',
      userEmail: currentUser?.email || 'Guest Analyst',
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, path), entry);
  } catch (error) {
    console.warn('Activity log fallback local execution:', error);
    // Graceful error handling for missing/insufficient permissions
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // Keep app responsive
    }
  }
}

/**
 * Real-time listener for activity logs
 */
export function subscribeActivityLogs(
  callback: (logs: ActivityLogEntry[]) => void,
  maxEntries = 30
): () => void {
  const path = 'activity_logs';
  try {
    const q = query(
      collection(db, path),
      orderBy('timestamp', 'desc'),
      limit(maxEntries)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs: ActivityLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id,
            action: data.action || 'Unknown Action',
            category: data.category || 'SYSTEM',
            details: data.details || '',
            userId: data.userId,
            userEmail: data.userEmail,
            createdAt: data.createdAt || new Date().toISOString(),
            timestamp: data.timestamp,
          });
        });
        callback(logs);
      },
      (error) => {
        console.warn('Activity log subscription warning:', error);
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Keep app running
        }
      }
    );
  } catch (error) {
    console.warn('Activity log setup error:', error);
    return () => {};
  }
}
