import { InventoryRepository } from "../../data/repositories/InventoryRepository";
import { initDb } from "../../infra/db/database";
import { seedCatalog } from "../../seed/seedCatalog";

export async function bootstrapApp() {
  await initDb();
  const repo = new InventoryRepository();
  const all = await repo.getAll();
  if (all.length === 0) {
    for (const item of seedCatalog) {
      await repo.upsert(item);
    }
  }
}
