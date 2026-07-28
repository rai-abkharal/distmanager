import { Router } from "express";
import { biltyController } from "../../controllers/bilty.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { biltySchema, biltyUpdateSchema } from "../../validators/index.js";

const router = Router();
router.post("/", validate(biltySchema), biltyController.create);
router.get("/", biltyController.list);
router.get("/delivery-charges", biltyController.deliveryChargeReport);
router.get("/next-number", biltyController.nextNumber);
router.get("/:id", biltyController.getById);
router.put("/:id", validate(biltyUpdateSchema), biltyController.update);
router.delete("/:id", biltyController.remove);
export default router;