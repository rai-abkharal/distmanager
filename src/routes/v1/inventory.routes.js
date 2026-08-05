import { Router } from "express";
import { inventoryController } from "../../controllers/inventory.controller.js";

const router = Router();
router.post("/receive", inventoryController.receiveStock);
router.post("/receive-batch", inventoryController.receiveStockBatch);
router.post("/dispatch", inventoryController.dispatch);
router.get("/levels", inventoryController.levels);
router.get("/movements", inventoryController.movements);
router.get("/low-stock", inventoryController.lowStock);
router.post("/threshold", inventoryController.setThreshold);
router.post("/set-stock", inventoryController.setStock);
export default router;
