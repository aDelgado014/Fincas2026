import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  static async log(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: any;
    afterJson?: any;
    metadata?: any;
    ip?: string;
    userAgent?: string;
  }) {
    await db.insert(auditLogs).values({
      id: uuidv4(),
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      beforeJson: data.beforeJson ? JSON.stringify(data.beforeJson) : null,
      afterJson: data.afterJson ? JSON.stringify(data.afterJson) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ip: data.ip,
      userAgent: data.userAgent,
    });
  }

  static async getRecentLogs(limit = 10) {
    return await db.query.auditLogs.findMany({
      limit,
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
    });
  }
}
