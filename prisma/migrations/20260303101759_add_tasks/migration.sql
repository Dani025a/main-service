-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('AFVENTER', 'IGANG', 'UDFORT', 'ANNULLERET');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('SYSTEM', 'ORDER', 'ANALYSIS', 'CUSTOMER');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "deadline" TIMESTAMPTZ(6),
    "status" "TaskStatus" NOT NULL DEFAULT 'AFVENTER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "related_order" JSONB,
    "related_customer" JSONB,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_tasks_seller_id" ON "tasks"("seller_id");

-- CreateIndex
CREATE INDEX "idx_tasks_customer_id" ON "tasks"("customer_id");

-- CreateIndex
CREATE INDEX "idx_tasks_order_id" ON "tasks"("order_id");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_deadline" ON "tasks"("deadline");

-- CreateIndex
CREATE INDEX "idx_notifications_kind" ON "notifications"("kind");

-- CreateIndex
CREATE INDEX "idx_notifications_read" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "idx_notifications_timestamp" ON "notifications"("timestamp");
