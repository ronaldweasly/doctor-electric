# Solar CRM API Documentation

## Overview

The Solar CRM API is a RESTful service providing CRUD operations for solar installation management. All requests require authentication via JWT token (HttpOnly cookie or Bearer token).

**Base URL**: `/api`  
**Authentication**: JWT Bearer token or HttpOnly cookie `auth_token`  
**Default Port**: 4000

---

## Quick Start

### Health Check
```bash
curl http://localhost:4000/api/health
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solar.com","password":"password"}'
```

Response includes `auth_token` cookie (HttpOnly) and user info in JSON.

---

## 🔐 Authentication Endpoints

### POST /auth/login
Login with email and password. Sets HTTPOnly cookie `auth_token`.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Sales Team",
    "active": true
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `403`: Account is inactive
- `400`: Invalid input

---

### POST /auth/logout
Clear authentication cookie and logout.

**Request:** Empty body

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /auth/me
Get current authenticated user's information.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Admin",
    "active": true
  }
}
```

**Error Responses:**
- `401`: Not authenticated

---

### POST /auth/register
Create new user (Admin only).

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "Jane Smith",
  "role": "Sales Team"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "Jane Smith",
    "role": "Sales Team"
  }
}
```

**Error Responses:**
- `400`: Invalid input
- `403`: Only admins can create users
- `409`: User already exists

---

### POST /auth/change-password
Change password for authenticated user.

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401`: Current password is incorrect
- `400`: Invalid input

---

## 👥 Clients Endpoints

### GET /clients
List all clients with pagination.

**Query Parameters:**
- `limit` (number, default: 20, max: 100) - Items per page
- `offset` (number, default: 0) - Items to skip

**Response (200):**
```json
{
  "data": [
    {
      "id": "C001",
      "name": "John Residential",
      "phone": "9876543210",
      "address": "123 Solar Street",
      "roof_type": "Flat",
      "system_size_kw": 5,
      "created_date": "2025-11-15",
      "assigned_to": "sales@solar.com",
      "created_at": "2025-11-15T10:30:00Z",
      "updated_at": "2025-12-20T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "pages": 13
  }
}
```

**Example:**
```bash
# Get first 20 clients
curl http://localhost:4000/api/clients?limit=20&offset=0

# Get next page
curl http://localhost:4000/api/clients?limit=20&offset=20
```

---

### POST /clients
Create new client (Admin, Sales Team only).

**Request:**
```json
{
  "id": "C250",
  "name": "Solar Customer Inc",
  "phone": "9123456789",
  "address": "456 Green Ave",
  "roof_type": "Sloped",
  "system_size_kw": 10,
  "created_date": "2026-05-12",
  "assigned_to": "sales@solar.com"
}
```

**Response (201):**
Returns created client object.

**Error Responses:**
- `400`: Invalid input
- `403`: Insufficient permissions

---

### GET /clients/{id}
Get client with all related data (surveys, quotations, installations, etc.).

**Response (200):**
```json
{
  "client": { /* Client object */ },
  "workflow": { /* Current workflow status */ },
  "survey": { /* Latest survey data */ },
  "quotation": { /* Latest quotation */ },
  "installation": { /* Installation data */ },
  "subsidy": { /* Subsidy information */ },
  "payment": { /* Payment status */ },
  "documents": { /* Document links */ }
}
```

**Error Responses:**
- `404`: Client not found

---

### DELETE /clients/{id}
Delete client and all related data (Admin only).

**Uses database transaction** - All deletions succeed or all fail together.

**Response (200):**
```json
{
  "message": "Client deleted successfully",
  "id": "C001"
}
```

**Error Responses:**
- `404`: Client not found
- `500`: Delete failed. Transaction rolled back.

---

## 📊 Utilities & Helpers

### GET /health
Check server and database health (no auth required).

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-12T10:30:00Z",
  "uptime": "3600s",
  "memory": "128MB",
  "database": "ok (15ms)",
  "db_pool": "20 total, 15 idle, 0 waiting"
}
```

**Response (503):**
```json
{
  "status": "degraded",
  "database": "error"
}
```

---

## 🔍 Request Tracing

All API requests are automatically traced for debugging. Response headers include:

```
X-Request-ID: req-<timestamp>-<random>  # Unique request identifier
X-Session-ID: req-<timestamp>-<random>  # Session identifier
```

Use these IDs to correlate requests in logs across frontend and backend.

---

## Error Responses

All error responses follow a standard format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Authenticated but lacks permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Database/service down |

---

## Rate Limiting

**Maximum Requests:**
- General endpoints: 100 requests per 15 minutes
- Auth login: 10 requests per 15 minutes

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1273363200
```

---

## Security Features

✅ **HTTPS/TLS**: All production traffic encrypted  
✅ **CSRF Protection**: SameSite cookie attribute  
✅ **XSS Protection**: HTTPOnly cookies + CSP headers  
✅ **Rate Limiting**: Per-IP and per-endpoint  
✅ **SQL Injection**: Parameterized queries  
✅ **CORS**: Whitelist-based origin checking  
✅ **Data Validation**: Zod schema validation  
✅ **Transaction Safety**: Database transactions for multi-step operations  
✅ **Audit Logging**: All actions logged with user/IP/timestamp  

---

## Examples

### Complete Login Flow
```bash
# 1. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{"email":"admin@solar.com","password":"pass"}'

# Cookie is automatically set and sent with subsequent requests

# 2. Get current user
curl http://localhost:4000/api/auth/me \
  -H "Cookie: auth_token=..."

# 3. List clients
curl "http://localhost:4000/api/clients?limit=20&offset=0" \
  -H "Cookie: auth_token=..."

# 4. Get single client
curl http://localhost:4000/api/clients/C001 \
  -H "Cookie: auth_token=..."

# 5. Logout
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Cookie: auth_token=..."
```

### Using Bearer Token (Alternative)
```bash
curl http://localhost:4000/api/clients \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Testing the API

### Using cURL
```bash
# Test health
curl http://localhost:4000/api/health

# Test with HTTPOnly cookies (curl handles automatically)
curl -c cookies.txt -b cookies.txt \
  -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solar.com","password":"pass"}'
```

### Using Postman
1. Create request to `/auth/login`
2. Enable cookie handling in Postman
3. Cookie automatically saved for subsequent requests

### Using Thunder Client (VS Code)
1. Install Thunder Client extension
2. Create requests with automatic cookie management
3. Use `{{base_url}}` variable for consistency

---

## Monitoring & Debugging

### View Request Logs
```bash
# Follow logs in real-time
docker logs -f solarcrm-backend

# With request filtering
docker logs solarcrm-backend | grep "POST /api/clients"
```

### Request IDs in Logs
Use `X-Request-ID` header from responses to correlate logs:
```
[2026-05-12T10:30:00Z] POST /api/clients [trace: req-abc123] from 192.168.1.100
[2026-05-12T10:30:01Z] ✓ 201 POST /api/clients 150ms [req-abc123]
```

---

## API Version

Current Version: **1.0.0**

All endpoints are under `/api/` prefix. Future versions will use `/api/v2/`.

---

## Support

For issues or questions:
1. Check error messages in logs
2. Use request IDs to correlate requests
3. Enable debug logging for troubleshooting
4. Contact the Solar CRM team
