import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SyncedIntervention {
  id: string;
  filmId: string;
  actionTitle: string;
  why: string;
  impact: string;
  urgency: string;
  confidence: number;
  executedAt: string;
}

export interface SyncedLeakStatus {
  id: string;
  status: 'ACTIVE' | 'TAKEDOWN_SENT' | 'REMOVED';
  statusUpdated: string;
}

/**
 * Log an intervention to Firestore
 */
export async function saveInterventionToFirestore(intervention: SyncedIntervention) {
  try {
    const docRef = doc(db, 'interventions', intervention.id);
    await setDoc(docRef, {
      ...intervention,
      timestamp: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore intervention save error:', err);
  }
}

/**
 * Real-time listener for logged interventions for a film
 */
export function subscribeInterventions(filmId: string, callback: (interventions: SyncedIntervention[]) => void) {
  try {
    const q = query(collection(db, 'interventions'));
    return onSnapshot(q, (snapshot) => {
      const list: SyncedIntervention[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SyncedIntervention;
        if (data.filmId === filmId) {
          list.push(data);
        }
      });
      callback(list);
    }, (err) => {
      console.warn('Firestore subscription warning:', err);
    });
  } catch (err) {
    console.warn('Firestore setup error:', err);
    return () => {};
  }
}

/**
 * Save or update leak takedown status in Firestore
 */
export async function updateLeakStatusInFirestore(leakId: string, status: 'ACTIVE' | 'TAKEDOWN_SENT' | 'REMOVED') {
  try {
    const docRef = doc(db, 'leakLinks', leakId);
    await setDoc(docRef, {
      id: leakId,
      status,
      statusUpdated: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore leak update error:', err);
  }
}

/**
 * Real-time listener for leak statuses
 */
export function subscribeLeakStatuses(callback: (statusMap: Record<string, 'ACTIVE' | 'TAKEDOWN_SENT' | 'REMOVED'>) => void) {
  try {
    const colRef = collection(db, 'leakLinks');
    return onSnapshot(colRef, (snapshot) => {
      const statusMap: Record<string, 'ACTIVE' | 'TAKEDOWN_SENT' | 'REMOVED'> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.id && data.status) {
          statusMap[data.id] = data.status;
        }
      });
      callback(statusMap);
    }, (err) => {
      console.warn('Firestore leaks subscription warning:', err);
    });
  } catch (err) {
    console.warn('Firestore leak listener setup error:', err);
    return () => {};
  }
}
