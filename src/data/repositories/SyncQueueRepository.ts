import { getDb } from "../../infra/db/database";
import { SyncQueueItem } from "../../shared/types/contracts";

type SyncRow = {
  id: string;
  entity: "inventory";
  entity_id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: string;
  status: SyncQueueItem["status"];
  retry_count: number;
  next_retry_at: string | null;
  conflict_reason: string | null;
  created_at: string;
  updated_at: string;
};

function mapSyncRow(row: SyncRow): SyncQueueItem {
  return {
    id: row.id,
    entity: row.entity,
    entityId: row.entity_id,
    action: row.action,
    payload: JSON.parse(row.payload),
    status: row.status,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
    conflictReason: row.conflict_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SyncQueueRepository {
  async enqueue(item: SyncQueueItem): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity, entity_id, action, payload, status, retry_count, next_retry_at, conflict_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.entity,
        item.entityId,
        item.action,
        JSON.stringify(item.payload),
        item.status,
        item.retryCount,
        item.nextRetryAt,
        item.conflictReason ?? null,
        item.createdAt,
        item.updatedAt,
      ]
    );
  }

  async listPending(nowIso: string): Promise<SyncQueueItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SyncRow>(
      `SELECT * FROM sync_queue
       WHERE status IN ('PENDING', 'FAILED')
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC`,
      [nowIso]
    );
    return rows.map(mapSyncRow);
  }

  async update(item: SyncQueueItem): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE sync_queue
       SET status=?, retry_count=?, next_retry_at=?, conflict_reason=?, updated_at=?, payload=?
       WHERE id=?`,
      [
        item.status,
        item.retryCount,
        item.nextRetryAt,
        item.conflictReason ?? null,
        item.updatedAt,
        JSON.stringify(item.payload),
        item.id,
      ]
    );
  }
}
