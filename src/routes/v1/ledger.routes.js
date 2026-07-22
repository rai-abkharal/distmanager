import { Router } from "express";
import { ledgerController } from "../../controllers/ledger.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { paymentSchema } from "../../validators/index.js";

const router = Router();
router.post("/payment", validate(paymentSchema), ledgerController.recordPayment);
router.post("/manual", ledgerController.manualEntry);
router.get("/party/:partyId", ledgerController.getPartyLedger);
router.delete("/:id", ledgerController.deleteEntry);
export default router;