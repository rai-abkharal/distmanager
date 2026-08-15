import { Router } from "express";
import { ledgerController } from "../../controllers/ledger.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { paymentSchema, deliveryChargeSchema } from "../../validators/index.js";

const router = Router();
router.post("/payment", validate(paymentSchema), ledgerController.recordPayment);
router.post("/delivery-charge", validate(deliveryChargeSchema), ledgerController.recordDeliveryCharge);
router.post("/manual", ledgerController.manualEntry);
router.get("/payments", ledgerController.listPayments);
router.get("/party/:partyId", ledgerController.getPartyLedger);
router.put("/:id", ledgerController.editEntry);
router.delete("/:id", ledgerController.deleteEntry);
export default router;
