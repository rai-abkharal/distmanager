import { Router } from "express";
import { biltyController } from "../../controllers/bilty.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { biltySchema } from "../../validators/index.js";

const router = Router();
router.post("/", validate(biltySchema), biltyController.create);
router.get("/", biltyController.list);
router.get("/delivery-charges", biltyController.deliveryChargeReport);
router.get("/:id", biltyController.getById);
export default router;