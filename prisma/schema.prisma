generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  AFVENTER   @map("Afventer")
  IGANG      @map("Igang")
  UDFORT     @map("Udført")
  ANNULLERET @map("Annulleret")

  @@map("task_status")
}

model Task {
  id         String     @id @default(uuid()) @db.Uuid
  title      String
  sellerId   String     @map("seller_id")
  customerId String     @db.Uuid @map("customer_id")
  orderId    String?    @db.Uuid @map("order_id")
  deadline   DateTime?  @db.Timestamptz(6)
  status     TaskStatus @default(AFVENTER)
  createdAt  DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@index([sellerId], map: "idx_tasks_seller_id")
  @@index([customerId], map: "idx_tasks_customer_id")
  @@index([orderId], map: "idx_tasks_order_id")
  @@index([status], map: "idx_tasks_status")
  @@index([deadline], map: "idx_tasks_deadline")
  @@map("tasks")
}