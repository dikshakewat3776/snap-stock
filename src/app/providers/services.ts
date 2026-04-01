import { InventoryRepository } from "../../data/repositories/InventoryRepository";
import { SyncQueueRepository } from "../../data/repositories/SyncQueueRepository";
import { MockInferenceAdapter } from "../../infra/inference/MockInferenceAdapter";
import { ReorderExportService } from "../../infra/export/ReorderExportService";
import { SyncService } from "../../infra/sync/SyncService";
import { ConfirmDetectionsUseCase } from "../../domain/usecases/ConfirmDetectionsUseCase";

const inventoryRepository = new InventoryRepository();
const syncQueueRepository = new SyncQueueRepository();
const inferenceAdapter = new MockInferenceAdapter();
const reorderExportService = new ReorderExportService();
const syncService = new SyncService(syncQueueRepository);
const confirmDetectionsUseCase = new ConfirmDetectionsUseCase(
  inventoryRepository,
  syncQueueRepository
);

export const services = {
  inventoryRepository,
  syncQueueRepository,
  inferenceAdapter,
  reorderExportService,
  syncService,
  confirmDetectionsUseCase,
};
