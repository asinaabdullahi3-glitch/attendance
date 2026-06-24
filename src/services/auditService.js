// Audit trail service for tracking system events
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const AUDIT_COLLECTION = 'audit_logs';

/**
 * Log an audit event
 * @param {string} action - The action performed (e.g., 'check_in', 'check_out', 'password_change')
 * @param {string} entityType - The type of entity (e.g., 'employee', 'admin')
 * @param {string} entityId - The ID of the entity (employee phone, admin ID, etc.)
 * @param {object} details - Additional details about the event
 * @param {string} performedBy - Who performed the action (phone or admin name)
 */
export async function logAuditEvent(action, entityType, entityId, details = {}, performedBy = 'system') {
  try {
    await addDoc(collection(db, AUDIT_COLLECTION), {
      action,
      entityType,
      entityId,
      details,
      performedBy,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error logging audit event:', error);
    return { success: false, error: 'Failed to log audit event' };
  }
}

/**
 * Get audit logs for a specific entity
 * @param {string} entityType - The type of entity
 * @param {string} entityId - The ID of the entity
 * @param {number} limitCount - Maximum number of logs to retrieve
 */
export async function getAuditLogsForEntity(entityType, entityId, limitCount = 50) {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
}

/**
 * Get recent audit logs across all entities
 * @param {number} limitCount - Maximum number of logs to retrieve
 */
export async function getRecentAuditLogs(limitCount = 100) {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting recent audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs filtered by action type
 * @param {string} action - The action to filter by
 * @param {number} limitCount - Maximum number of logs to retrieve
 */
export async function getAuditLogsByAction(action, limitCount = 50) {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('action', '==', action),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting audit logs by action:', error);
    return [];
  }
}
