import { Router } from "express";
import { companyController } from "../../controllers/company.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { companyPaymentSchema } from "../../validators/index.js";

const router = Router();
router.post("/payment", validate(companyPaymentSchema), companyController.recordPayment);
router.get("/summary", companyController.summary);
router.get("/statement", companyController.monthlyStatement);
export default router;