import { Router } from "express";
import { productController } from "../../controllers/product.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { productSchema } from "../../validators/index.js";

const router = Router();
router.post("/", validate(productSchema), productController.create);
router.get("/", productController.list);
router.get("/:id/scheme-preview", productController.previewScheme);
router.put("/:id", productController.update);
router.patch("/:id/archive", productController.archive);
export default router;