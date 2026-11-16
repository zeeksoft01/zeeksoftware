import { AuditLog } from '../types';
import { AuditLogModel } from '../models';
import { requireDatabaseConnection } from '../config/database';

export const auditService = {
  async addLog(action: string, details: string, adminUser = 'Admin'): Promise<AuditLog> {
    requireDatabaseConnection();
    const entry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      action,
      details,
      adminUser,
      timestamp: new Date().toISOString(),
    };

    await AuditLogModel.create(entry);
    return entry;
  },

  async getLogs(limit = 100): Promise<AuditLog[]> {
    requireDatabaseConnection();
    const docs = await AuditLogModel.find().sort({ timestamp: -1 }).limit(limit).lean();
    return docs.map(({ _id, ...rest }) => rest as AuditLog);
  },
};
