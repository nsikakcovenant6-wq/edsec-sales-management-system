export interface AuditLogInput {
  businessId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  requestId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogWriter {
  auditLog: {
    create(args: {
      data: {
        businessId: string;
        actorUserId: string | null;
        action: string;
        targetType: string;
        targetId: string | null;
        requestId: string;
        metadata: Record<string, unknown>;
      };
    }): Promise<unknown>;
  };
}

/** Append-only audit write. The database migration blocks update/delete mutations. */
export function writeAuditLog(client: AuditLogWriter, input: AuditLogInput): Promise<unknown> {
  return client.auditLog.create({
    data: {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      requestId: input.requestId,
      metadata: input.metadata ?? {},
    },
  });
}
