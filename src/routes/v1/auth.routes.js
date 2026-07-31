import { Router } from "express";
import { authController } from "../../controllers/auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { setupSchema, loginSchema, changePasswordSchema } from "../../validators/index.js";

const router = Router();

// Public
router.get("/status", authController.status);
router.post("/setup", validate(setupSchema), authController.setup);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);

// Protected
router.get("/me", protect, authController.me);
router.post("/change-password", protect, validate(changePasswordSchema), authController.changePassword);

export default router;
