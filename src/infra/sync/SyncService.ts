import { computeNextRetryIso } from "../../domain/services/syncBackoff";
import { SyncQueueItem } from "../../shared/types/contracts";

type SyncQueueStore = {
  listPending(nowIso: string): Promise<SyncQueueItem[]>;
  update(item: SyncQueueItem): Promise<void>;
};

export class SyncService {
  constructor(private readonly syncQueueRepository: SyncQueueStore) {}

  async processQueue(simulateOnline: boolean) {
    // Pull only items that are due for retry now (or never retried).
    const pending = await this.syncQueueRepository.listPending(new Date().toISOString());
    for (const item of pending) {
      try {
        if (!simulateOnline) {
          throw new Error("offline");
        }
        // Conflict path is intentionally explicit so UI can show manual review.
        if (item.payload["forceConflict"] === true) {
          item.status = "CONFLICT";
          item.conflictReason = "Remote version mismatch";
        } else {
          item.status = "DONE";
          item.conflictReason = undefined;
        }
        item.updatedAt = new Date().toISOString();
        await this.syncQueueRepository.update(item);
      } catch (_error) {
        // Exponential backoff avoids hammering network on poor connectivity.
        item.retryCount += 1;
        item.status = "FAILED";
        item.nextRetryAt = computeNextRetryIso(item.retryCount);
        item.updatedAt = new Date().toISOString();
        await this.syncQueueRepository.update(item);
      }
    }
  }
}
