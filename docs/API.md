# Complete API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://yourdomain.com/api
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <token>
```

Or use NextAuth.js session cookies for browser requests.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

## Endpoints

### 1. Authentication

#### POST /auth/signup
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "cid_123",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionPlan": "FREE_TRIAL"
  }
}
```

#### POST /auth/login
Login with credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": { ... }
}
```

### 2. Content

#### GET /content
List all content with filters.

**Query Parameters:**
- `type`: MOVIE | SERIES | ANIME | KDRAMA
- `genre`: Action, Comedy, etc.
- `year`: Release year
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /content/:id
Get detailed content information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "content_id",
    "title": "The Quantum Realm",
    "description": "...",
    "type": "MOVIE",
    "genres": ["Sci-Fi", "Action"],
    "language": "en",
    "releaseYear": 2024,
    "durationMins": 148,
    "imdbRating": 8.5,
    "posterUrl": "...",
    "backdropUrl": "...",
    "episodes": [ ... ],
    "videoSources": [ ... ],
    "subtitles": [ ... ]
  }
}
```

#### GET /content/trending
Get trending content.

**Response:**
```json
{
  "success": true,
  "data": [ ... ]
}
```

#### GET /content/search
Search for content.

**Query Parameters:**
- `q`: Search query
- `type`: Filter by type
- `genre`: Filter by genre
- `page`: Page number
- `limit`: Items per page

**Response:** Same as `/content`

### 3. User

#### GET /user/profile
Get user profile (Protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "...",
    "subscriptionPlan": "BASIC",
    "subscriptionStatus": "ACTIVE",
    "trialEnd": "2024-05-23T..."
  }
}
```

#### PUT /user/profile
Update user profile (Protected).

**Request:**
```json
{
  "name": "Jane Doe",
  "avatarUrl": "https://..."
}
```

#### GET /user/favorites
Get user favorites (Protected).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fav_1",
      "content": { ... },
      "addedAt": "2024-05-23T..."
    }
  ]
}
```

#### POST /user/favorites
Add content to favorites (Protected).

**Request:**
```json
{
  "contentId": "content_id"
}
```

#### DELETE /user/favorites/:contentId
Remove from favorites (Protected).

#### GET /user/plantowatch
Get plan-to-watch list (Protected).

#### POST /user/plantowatch
Add to plan-to-watch (Protected).

#### DELETE /user/plantowatch/:contentId
Remove from plan-to-watch (Protected).

### 4. Watch Progress

#### GET /watch-progress
Get watch history (Protected).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "history_1",
      "contentId": "...",
      "episodeId": "...",
      "progressSeconds": 3600,
      "completed": false,
      "watchedAt": "2024-05-23T..."
    }
  ]
}
```

#### POST /watch-progress
Update watch progress (Protected).

**Request:**
```json
{
  "contentId": "content_id",
  "episodeId": "episode_id", // Optional
  "progressSeconds": 1800,
  "completed": false
}
```

### 5. Subscriptions

#### GET /subscription/plans
Get available subscription plans.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "basic",
      "name": "Basic",
      "price": 4.99,
      "screens": 1,
      "quality": "1080p",
      "downloads": false
    }
  ]
}
```

#### GET /subscription/status
Get current subscription (Protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_id",
    "plan": "BASIC",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-05-01T...",
    "currentPeriodEnd": "2024-06-01T..."
  }
}
```

#### POST /subscription/create-checkout
Create Stripe checkout session (Protected).

**Request:**
```json
{
  "plan": "STANDARD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_..."
  }
}
```

#### POST /subscription/cancel
Cancel subscription (Protected).

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled"
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g., email already exists) |
| 429 | Rate Limited |
| 500 | Server Error |
| 503 | Service Unavailable |

## Rate Limiting

- Default: 100 requests per minute
- Rate limit headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## CORS

CORS is enabled for:
- localhost:3000
- localhost:3001
- Production domain (NEXTAUTH_URL)

## Examples

### JavaScript/Fetch

```javascript
// Signup
const res = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secure123',
    name: 'John'
  })
});

// Get content with auth
const res = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Using API Client

```javascript
import { contentAPI, userAPI } from '@/lib/api-client';

// Get content
const content = await contentAPI.getAll();

// Get favorites
const favorites = await userAPI.getFavorites();

// Add to favorites
await userAPI.addFavorite('content_id');
```

## Webhooks (Stripe)

Stripe webhooks handle:
- `payment_intent.succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

See `src/app/api/subscription/webhook/route.ts`

---

**Last Updated**: 2024-05-23
**API Version**: 1.0.0
