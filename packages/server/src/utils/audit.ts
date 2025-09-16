import { prisma } from '../lib/prisma';

export interface AuditLogData {
  [key: string]: any;
}

/**
 * Create an audit log entry
 * @param projectId - Project ID (use 'system' for system-wide events)
 * @param userId - User ID (use 'anonymous' for unauthenticated events)
 * @param action - Action performed
 * @param details - Additional details about the action
 */
export async function auditLog(
  projectId: string,
  userId: string,
  action: string,
  details: AuditLogData = {}
): Promise<void> {
  try {
    // For system events, don't create audit log entries that reference non-existent projects
    if (projectId === 'system') {
      console.log(`Audit: ${action} by ${userId}`, details);
      return;
    }
    
    await prisma.auditLog.create({
      data: {
        projectId,
        userId,
        action,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          userAgent: details.userAgent || 'unknown',
          ip: details.ip || 'unknown'
        }
      }
    });
  } catch (error) {
    // Log the error but don't fail the operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs for a project
 * @param projectId - Project ID
 * @param limit - Maximum number of logs to return
 * @param offset - Number of logs to skip
 */
export async function getAuditLogs(
  projectId: string,
  limit: number = 100,
  offset: number = 0
) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
    
    return logs;
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a user
 * @param userId - User ID
 * @param limit - Maximum number of logs to return
 * @param offset - Number of logs to skip
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  offset: number = 0
) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
    
    return logs;
  } catch (error) {
    console.error('Failed to get user audit logs:', error);
    return [];
  }
}
