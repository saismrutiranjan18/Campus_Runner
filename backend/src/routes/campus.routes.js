import { Router } from "express";

import { getPublicCampusById, listPublicCampuses } from "../controllers/campusConfig.controller.js";

const router = Router();

router.get("/", listPublicCampuses);
router.get("/:campusId", getPublicCampusById);

export default router;