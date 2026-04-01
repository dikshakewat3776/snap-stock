import { InventoryRepository } from "../../data/repositories/InventoryRepository";
import { SyncQueueRepository } from "../../data/repositories/SyncQueueRepository";
import { DetectionResult } from "../../shared/types/contracts";

export class ConfirmDetectionsUseCase {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly syncQueueRepository: SyncQueueRepository
  ) {}

  async execute(detectionResult: DetectionResult) {
    // We intentionally update local DB first (offline-first guarantee).
    const items = await this.inventoryRepository.getAll();
    for (const detected of detectionResult.aggregatedItems) {
      const existing = items.find(
        (item) => item.name === detected.productName && item.brand === detected.brand
      );
      const now = new Date().toISOString();
      if (existing) {
        const updated = {
          ...existing,
          currentStock: existing.currentStock + detected.quantity,
          updatedAt: now,
        };
        await this.inventoryRepository.upsert(updated);
        // Queue sync mutation separately; network failures should not block local save.
        await this.syncQueueRepository.enqueue({
          id: `sync_${Date.now()}_${existing.id}`,
          entity: "inventory",
          entityId: existing.id,
          action: "UPDATE",
          payload: updated,
          status: "PENDING",
          retryCount: 0,
          nextRetryAt: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}
