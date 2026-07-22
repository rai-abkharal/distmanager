import { Router } from "express";
import { reportController } from "../../controllers/report.controller.js";

const router = Router();
router.get("/party-statement/:partyId", reportController.partyStatement);
router.get("/monthly-summary", reportController.monthlySummary);
router.get("/company-settlement", reportController.companySettlement);
router.get("/inventory", reportController.inventoryReport);
export default router;