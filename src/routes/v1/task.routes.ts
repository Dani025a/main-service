import { Router } from "express";
import { taskController } from "../../controllers/task.controller.js";
import { requireGatewayOrM2mApiAuth } from "../../middleware/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.middleware.js";
import {
    createTaskBodySchema,
    customerTaskParamsSchema,
    listTaskQuerySchema,
    sellerTaskParamsSchema,
    updateTaskBodySchema,
    updateTaskParamsSchema,
} from "./task.schemas.js";

export const taskRoutes = Router();

taskRoutes.use(requireGatewayOrM2mApiAuth());

taskRoutes.post("/", validateBody(createTaskBodySchema), taskController.create);
taskRoutes.patch(
    "/:id",
    validateParams(updateTaskParamsSchema),
    validateBody(updateTaskBodySchema),
    taskController.update,
);
taskRoutes.get("/", validateQuery(listTaskQuerySchema), taskController.list);
taskRoutes.get(
    "/seller/:sellerId",
    validateParams(sellerTaskParamsSchema),
    validateQuery(listTaskQuerySchema),
    taskController.listForSeller,
);
taskRoutes.get(
    "/customer/:customerId",
    validateParams(customerTaskParamsSchema),
    validateQuery(listTaskQuerySchema),
    taskController.listForCustomer,
);
