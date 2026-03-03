import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function main() {
    const app = await createApp();

    app.listen(env.PORT, () => {
        logger.info(
            {
                port: env.PORT,
                env: env.NODE_ENV,
            },
            "main-service started",
        );
    });
}

main().catch((err) => {
    logger.error({ err }, "fatal startup error");
    process.exit(1);
});
