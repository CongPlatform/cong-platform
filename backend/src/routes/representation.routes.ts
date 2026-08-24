import {
  Router,
} from "express";

import {
  createMyRepresentation,
  listMyRepresentations,
  requestMyRepresentation,
  searchRepresentationOrganizations,
} from "../controllers/representation.controller.js";

import {
  createRepresentationSchema,
  requestRepresentationSchema,
} from "../validators/representation.validator.js";

import {
  validateBody,
} from "../middlewares/validate.js";

const representationRouter =
  Router();

representationRouter.get(
  "/",
  listMyRepresentations,
);

representationRouter.get(
  "/search",
  searchRepresentationOrganizations,
);

representationRouter.post(
  "/",
  validateBody(
    createRepresentationSchema,
  ),
  createMyRepresentation,
);

representationRouter.post(
  "/request",
  validateBody(
    requestRepresentationSchema,
  ),
  requestMyRepresentation,
);

export default representationRouter;