import express from "express";
import helmet from "helmet";
import compression from "compression";

import { httpLogger } from "./config/logger.js";

import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

import { healthRoutes } from "./routes/health.routes.js";
import { v1Routes } from "./routes/v1/index.js";
import { tokenRoutes } from "./routes/token.routes.js";

export async function createApp() {
    const app = express();

    app.set("trust proxy", 1);

    app.use(requestIdMiddleware());
    app.use(httpLogger);

    app.use(
        helmet({
            contentSecurityPolicy: false,
        }),
    );

    app.use(compression());


    // Body parsers (keep JSON limit reasonable)
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));


    // Routes
    app.use("/", healthRoutes);
    app.use("/api/v1", v1Routes);
    app.use("/oauth", tokenRoutes)


    // Error handler LAST
    app.use(errorMiddleware());

    return app;
}
