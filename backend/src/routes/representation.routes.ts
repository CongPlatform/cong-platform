import { Router } from "express";

import {
  cancelMyRepresentationRequest,
  checkMyRepresentationCnpj,
  createMyRepresentation,
  listMyRepresentations,
  requestMyRepresentation,
  searchRepresentationOrganizations,
} from "../controllers/representation.controller.js";

import {
  createRepresentationSchema,
  requestRepresentationSchema,
} from "../validators/representation.validator.js";

import { validateBody } from "../middlewares/validate.js";

const representationRouter = Router();

representationRouter.get("/", listMyRepresentations);

representationRouter.get("/check-cnpj", checkMyRepresentationCnpj);

representationRouter.get("/search", searchRepresentationOrganizations);

representationRouter.post(
  "/",
  validateBody(createRepresentationSchema),
  createMyRepresentation,
);

representationRouter.post(
  "/request",
  validateBody(requestRepresentationSchema),
  requestMyRepresentation,
);

representationRouter.delete(
  "/request/:representationId",
  cancelMyRepresentationRequest,
);

export default representationRouter;
