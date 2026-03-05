import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startQuoteNotificationReceiver } from "./workers/quote-notification.receiver.js";

async function main() {
    const app = await createApp();
    const quoteNotificationReceiver = await startQuoteNotificationReceiver();
    let isShuttingDown = false;

    const server = app.listen(env.PORT, () => {
        logger.info(
            {
                port: env.PORT,
                env: env.NODE_ENV,
            },
            "main-service started",
        );
    });

    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.info({ signal }, "shutdown started");

        try {
            if (quoteNotificationReceiver) {
                await quoteNotificationReceiver.close();
            }

            await new Promise<void>((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });

            logger.info({ signal }, "shutdown complete");
            process.exit(0);
        } catch (err) {
            logger.error({ err, signal }, "shutdown failed");
            process.exit(1);
        }
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
}

main().catch((err) => {
    logger.error({ err }, "fatal startup error");
    process.exit(1);
});
