import { computeNextRetryIso } from "../domain/services/syncBackoff";
import { SyncService } from "../infra/sync/SyncService";

describe("sync queue retry and backoff", () => {
  it("computes increasing retry timestamps", () => {
    const now = new Date("2026-04-01T10:00:00.000Z");
    const first = new Date(computeNextRetryIso(0, now)).getTime();
    const second = new Date(computeNextRetryIso(1, now)).getTime();
    expect(second).toBeGreaterThan(first);
  });

  it("marks item failed and increments retry on offline process", async () => {
    const queue = [
      {
        id: "sync_1",
        entity: "inventory" as const,
        entityId: "p1",
        action: "UPDATE" as const,
        payload: { name: "x" },
        status: "PENDING" as const,
        retryCount: 0,
        nextRetryAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const updates: Array<{ status: string; retryCount: number; nextRetryAt: string | null }> = [];
    const repo = {
      async listPending() {
        return queue;
      },
      async update(item: (typeof queue)[number]) {
        updates.push({
          status: item.status,
          retryCount: item.retryCount,
          nextRetryAt: item.nextRetryAt,
        });
      },
    };
    const service = new SyncService(repo as never);
    await service.processQueue(false);
    expect(updates[0].status).toBe("FAILED");
    expect(updates[0].retryCount).toBe(1);
    expect(updates[0].nextRetryAt).not.toBeNull();
  });
});
