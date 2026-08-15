import { Router } from "express";
import authRoutes from "./auth.routes.js";
import partyRoutes from "./party.routes.js";
import productRoutes from "./product.routes.js";
import ledgerRoutes from "./ledger.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import biltyRoutes from "./bilty.routes.js";
import companyRoutes from "./company.routes.js";
import cashflowRoutes from "./cashflow.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import reportRoutes from "./report.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";

const router = Router();

// Public
router.use("/auth", authRoutes);

// Protected (require PIN/JWT)
router.use("/onboarding", protect, idempotency, onboardingRoutes);
router.use("/parties", protect, idempotency, partyRoutes);
router.use("/products", protect, idempotency, productRoutes);
router.use("/ledger", protect, idempotency, ledgerRoutes);
router.use("/inventory", protect, idempotency, inventoryRoutes);
router.use("/bilty", protect, idempotency, biltyRoutes);
router.use("/company", protect, idempotency, companyRoutes);
router.use("/cashflow", protect, idempotency, cashflowRoutes);
router.use("/dashboard", protect, dashboardRoutes);
router.use("/reports", protect, reportRoutes);

export default router;
