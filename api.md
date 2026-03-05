# Main Service API

Base URL (local): `http://localhost:3030`

All JSON APIs use:
- `Content-Type: application/json`
- Optional `x-request-id` header (if omitted, server generates one)

Error format (all endpoints):
```json
{
  "ok": false,
  "code": "SOME_ERROR_CODE",
  "message": "Human readable message",
  "requestId": "uuid"
}
```

## Auth Overview

`/api/v1/*` endpoints require one of:
- `x-gateway-assertion: <jwt>`
- `Authorization: Bearer <m2m_token>`

You can create M2M token via `POST /oauth/token`.

## 1) Health Check

### `GET /health`
What it is:
- Basic service liveness endpoint.

Body needed:
- None.

Success response:
```json
{
  "ok": true,
  "service": "user-service"
}
```

## 2) M2M Token

### `POST /oauth/token`
What it is:
- Issues a machine-to-machine bearer token.

Body needed (choose one format, strict object):
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```
or
```json
{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

Success response:
```json
{
  "ok": true,
  "access_token": "jwt",
  "token_type": "Bearer",
  "expires_in": 900
}
```

Common errors:
- `400 VALIDATION_ERROR` invalid body shape
- `401 INVALID_CLIENT` wrong credentials

## 3) Tasks API

Auth required:
- `x-gateway-assertion` or `Authorization: Bearer ...`

### `GET /api/v1/tasks/me`
What it is:
- Lists tasks with optional filters.

Body needed:
- None.

Query params (all optional):
- `sellerId` (string)
- `customerId` (string)
- `quoteId` (string)
- `statuses` (either comma-separated string or repeated query param array)
  - Allowed values: `AFVENTER`, `IGANG`, `UDFORT`, `ANNULLERET`

Example:
`GET /api/v1/tasks/me?sellerId=usr_1&statuses=AFVENTER,IGANG`

Success response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "task_1",
      "title": "Follow up",
      "sellerId": "usr_1",
      "customerId": "cust_1",
      "quoteId": "quote_1",
      "deadline": "2026-03-05T12:00:00.000Z",
      "status": "AFVENTER"
    }
  ]
}
```

### `POST /api/v1/tasks`
What it is:
- Creates a task.

Body needed:
```json
{
  "title": "Call customer",
  "sellerId": "usr_sales_001",
  "customerId": "cust_001",
  "quoteId": "quote_001",
  "deadline": "2026-03-05T12:00:00.000Z",
  "status": "AFVENTER"
}
```

Required fields:
- `title` (string)
- `sellerId` (string)
- `customerId` (string)
- `quoteId` (string)

Optional fields:
- `deadline` (ISO datetime string)
- `status` (`AFVENTER | IGANG | UDFORT | ANNULLERET`)

Success response:
- `201 Created`
```json
{
  "ok": true,
  "data": {
    "id": "task_1",
    "title": "Call customer",
    "sellerId": "usr_sales_001",
    "customerId": "cust_001",
    "quoteId": "quote_001",
    "deadline": "2026-03-05T12:00:00.000Z",
    "status": "AFVENTER"
  }
}
```

### `PATCH /api/v1/tasks/:id/status`
What it is:
- Updates task status.

Path params:
- `id` (string)

Body needed:
```json
{
  "status": "IGANG"
}
```

Allowed status:
- `AFVENTER | IGANG | UDFORT | ANNULLERET`

Success response:
```json
{
  "ok": true,
  "data": {
    "id": "task_1",
    "title": "Call customer",
    "sellerId": "usr_sales_001",
    "customerId": "cust_001",
    "quoteId": "quote_001",
    "deadline": "2026-03-05T12:00:00.000Z",
    "status": "IGANG"
  }
}
```

Common errors:
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND` if task id does not exist

## 4) Notifications API

Auth required:
- `x-gateway-assertion` or `Authorization: Bearer ...`

### `GET /api/v1/notifications/me`
What it is:
- Lists notifications with optional filters and sorting.

Body needed:
- None.

Query params (all optional):
- `sellerId` (string)
- `relatedQuote` (string)
- `relatedCustomer` (string)
- `sortBy` (`timestamp` or `sellerId`)
- `sortOrder` (`asc` or `desc`)

Example:
`GET /api/v1/notifications/me?sellerId=usr_1&sortBy=timestamp&sortOrder=desc`

Success response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "notif_1",
      "sellerId": "usr_1",
      "kind": "SYSTEM",
      "message": "Postman notification test",
      "timestamp": "2026-03-05T12:00:00.000Z",
      "read": false,
      "relatedQuote": "quote_1",
      "relatedCustomer": null
    }
  ]
}
```

### `POST /api/v1/notifications`
What it is:
- Creates an in-app notification.

Body needed:
```json
{
  "sellerId": "usr_sales_001",
  "kind": "SYSTEM",
  "message": "Postman notification test",
  "relatedQuote": "quote_001",
  "relatedCustomer": "customer_001"
}
```

Required fields:
- `sellerId` (string)
- `kind` (`SYSTEM | ORDER | ANALYSIS | CUSTOMER`)
- `message` (string)

Optional fields:
- `relatedQuote` (string or `null`)
- `relatedCustomer` (string or `null`)

Notes:
- For `kind: "SYSTEM"`, `relatedQuote` and `relatedCustomer` can be omitted or set to `null`.
- If non-null IDs are provided, they must satisfy DB foreign key constraints.

Success response:
- `201 Created`
```json
{
  "ok": true,
  "data": {
    "id": "notif_1",
    "sellerId": "usr_sales_001",
    "kind": "SYSTEM",
    "message": "Postman notification test",
    "timestamp": "2026-03-05T12:00:00.000Z",
    "read": false,
    "relatedQuote": "quote_001",
    "relatedCustomer": null
  }
}
```

Common errors:
- `400 VALIDATION_ERROR` invalid payload or FK references not found

### `PATCH /api/v1/notifications/:id/read`
What it is:
- Marks a notification as read.

Path params:
- `id` (string)

Body needed:
- None.

Success response:
```json
{
  "ok": true,
  "data": {
    "id": "notif_1",
    "sellerId": "usr_sales_001",
    "kind": "SYSTEM",
    "message": "Postman notification test",
    "timestamp": "2026-03-05T12:00:00.000Z",
    "read": true,
    "relatedQuote": "quote_001",
    "relatedCustomer": null
  }
}
```

Common errors:
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND` if notification id does not exist

