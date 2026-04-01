import { InventoryItem } from "../../shared/types/contracts";
import { getDb } from "../../infra/db/database";

type InventoryRow = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  barcode: string | null;
  current_stock: number;
  threshold: number;
  updated_at: string;
};

function mapRow(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    sku: row.sku ?? undefined,
    barcode: row.barcode ?? undefined,
    currentStock: row.current_stock,
    threshold: row.threshold,
    updatedAt: row.updated_at,
  };
}

export class InventoryRepository {
  async getAll(): Promise<InventoryItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<InventoryRow>(
      "SELECT * FROM inventory_items ORDER BY updated_at DESC"
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<InventoryItem | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<InventoryRow>(
      "SELECT * FROM inventory_items WHERE id = ?",
      [id]
    );
    return row ? mapRow(row) : null;
  }

  async upsert(item: InventoryItem): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO inventory_items (id, name, brand, sku, barcode, current_stock, threshold, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         brand=excluded.brand,
         sku=excluded.sku,
         barcode=excluded.barcode,
         current_stock=excluded.current_stock,
         threshold=excluded.threshold,
         updated_at=excluded.updated_at`,
      [
        item.id,
        item.name,
        item.brand,
        item.sku ?? null,
        item.barcode ?? null,
        item.currentStock,
        item.threshold,
        item.updatedAt,
      ]
    );
  }

  async upsertWithCorrection(item: InventoryItem, oldStock: number, reason = "Manual edit"): Promise<void> {
    const db = await getDb();
    await this.upsert(item);
    if (oldStock !== item.currentStock) {
      await db.runAsync(
        `INSERT INTO stock_corrections (id, product_id, old_stock, new_stock, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `corr_${Date.now()}_${item.id}`,
          item.id,
          oldStock,
          item.currentStock,
          reason,
          new Date().toISOString(),
        ]
      );
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM inventory_items WHERE id = ?", [id]);
  }
}
