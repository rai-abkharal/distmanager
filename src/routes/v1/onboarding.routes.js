import { Router } from "express";
import { onboardingController } from "../../controllers/onboarding.controller.js";

const router = Router();
router.post("/opening-balances", onboardingController.openingBalances);
router.post("/opening-stock", onboardingController.openingStock);
export default router;