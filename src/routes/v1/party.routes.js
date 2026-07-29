import { Router } from "express";
import { partyController } from "../../controllers/party.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { partySchema } from "../../validators/index.js";

const router = Router();
router.post("/", validate(partySchema), partyController.create);
router.get("/", partyController.list);
router.get("/receivables", partyController.totalReceivables);
router.get("/:id", partyController.getById);
router.put("/:id", partyController.update);
router.patch("/:id/archive", partyController.archive);
router.delete("/:id", partyController.remove);
export default router;
