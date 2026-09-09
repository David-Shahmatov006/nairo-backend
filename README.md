# 🚀 Nairo Backend

Backend API for Nairo — a modern social networking platform built with NestJS, TypeScript, PostgreSQL, Redis and Socket.IO.

The server provides authentication, real-time messaging (text + voice), user management, posts, comments, achievements, notifications, and secure API endpoints.

---

## 🌍 Live API

🔗 Swagger: https://nairo-backend-production.up.railway.app/api

🔗 Frontend: https://nairo-frontend-production.up.railway.app/

---

## ✨ Features

### 🔐 Authentication

- User registration
- Login
- JWT Authentication (access token `1d`, refresh token `7d`)
- Refresh Tokens
- Password reset OTP sent by email
- Password recovery with a one-time reset token
- Secure HttpOnly Cookies
- Password hashing with bcrypt
- Rate limiting on auth endpoints

---

### 👤 User Management

- User profiles
- Avatar upload (old avatar is removed from storage automatically)
- Bio editing
- Username validation
- Availability checks for email / username (`/user/check`, `/user/is-email-exists`)
- Change email
- Change password
- Preferred language (`preferredLanguage`, default `en`)
- Follow / Unfollow users
- Search users

---

### 📝 Posts

- Create posts
- Upload images
- Edit posts
- Delete posts (image is removed from storage)
- Likes
- Comments (create / edit / delete)
- Saved posts
- Paginated feed, user posts and saved posts (`page`, `limit`, max 50 per page)

---

### 💬 Real-Time Chat

- Private chats
- Real-time messaging
- Voice messages (audio upload + waveform + duration)
- Typing indicator
- Recording indicator
- Read receipts and unread counters per chat
- Message history
- Delete chats
- Delete/Edit messages (`editedAt`)
- Messages notifications on platform

Powered by Socket.IO

---

### 🏆 Achievements

Users unlock achievements that are evaluated server-side. Time-based rules use the
client's IANA time zone (validated via `Intl.DateTimeFormat`), so holidays and night
hours are checked in the user's local time.

| Key | How it unlocks |
|---|---|
| `early_bird` | Registering while the platform has 100 users or fewer |
| `night_owl` | Publishing a post between 03:00 and 04:59 local time |
| `polyglot` | Changing the preferred interface language |
| `veteran` | One year since registration |
| `valentine` | Visiting the app on February 14 |
| `halloween` | Visiting the app on October 31 |
| `christmas_spirit` | Visiting the app on December 25 |

Endpoints:

- `POST /user/visit` — records a visit, evaluates date-based rules and returns
  the full achievement list plus `newlyUnlocked`
- `GET /user/:id/achievements` — achievement list with `unlocked` flags

Unlocked keys are stored in a `jsonb` column on the user, and holiday rules live in
`src/user/achievements/rules` so new ones can be added declaratively.

---

### 🎙️ Voice Messages

- `POST /chats/voice` (`multipart/form-data`) with the `audio` file
- Duration between **0.5s and 120s**
- Waveform of exactly **48 amplitude bars** in the `0..100` range
- Audio files up to **10 MB**
- Allowed formats: `webm`, `ogg`, `opus`, `mp4`, `m4a`, `mp3`, `wav`
- Content is verified by magic bytes, not only by the reported MIME type
- Uploaded audio is rolled back from storage if saving the message fails
- Delivered over Socket.IO to the chat room like any other message
- Rate limited to 20 uploads per minute

---

### 📧 Email

- 6-digit OTP codes with a 10-minute TTL
- Password reset emails
- HTML email templates
- Delivered through Resend

---

### 📂 File Uploads

- Avatar uploads (images up to 5 MB)
- Post images (images up to 5 MB)
- Voice messages (audio up to 10 MB)
- In-memory upload buffers, streamed straight to Cloudflare R2
- Real file-type detection with `file-type` (magic bytes)
- Static file serving from `/uploads`

---

### 🛡️ Security

- JWT Authentication
- Refresh Token validation
- Cookie authentication
- Password hashing
- DTO validation with a global `ValidationPipe` (`whitelist`, `transform`)
- Rate limiting with a global `ThrottlerGuard`
- CORS allowlist for the frontend origins
- Environment variables


## 🛠️ Tech Stack

### Framework
- NestJS
- TypeScript

### Database
- PostgreSQL
- TypeORM
- Redis

### Authentication
- JWT
- Passport (passport-jwt)
- bcrypt

### Validation
- class-validator
- class-transformer

### Realtime
- Socket.IO

### API Documentation
- Swagger (@nestjs/swagger / OpenAPI)

### Rate Limiting
- @nestjs/throttler

### Email
- Resend

### Media Storage
- Cloudflare R2 (@aws-sdk/client-s3)
- Multer
- file-type

### Testing
- Jest
- ts-jest

### Configuration
- dotenv
- ConfigModule

### Utilities
- Cookie Parser
- UUID

---

## 🗄️ Database

The project uses PostgreSQL with TypeORM and Redis for temporary password reset secrets.

Features include:

- Entity relationships
- Migrations
- Repository pattern
- UUID primary keys
- `timestamptz` timestamps
- `jsonb` columns (read receipts, achievements, waveforms)
- Composite index on `message(chatId, createdAt)` for fast history loading

### Migrations

```bash
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
npm run migration:revert

# against a built dist (production)
npm run migration:prod
```

Migrations run against `src/data-source.ts`, which uses `DATABASE_PUBLIC_URL`
when set (with SSL) and falls back to the individual `DB_*` variables locally.

---

## 📡 API

Swagger UI is served at **`/api`** and documents every route, DTO and response
shape. Protected endpoints use the `access-token` bearer scheme — paste the access
token returned by login.

Main API modules:

- Authentication (`/auth`)
- Password Reset (`/password-reset`)
- Users (`/user`)
- Achievements (`/user/visit`, `/user/:id/achievements`)
- Posts (`/posts`)
- Comments (`/comments`)
- Chats & Messages (`/chats`)
- File Uploads

REST API architecture with real-time communication via Socket.IO.

---

## 🔒 Authentication Flow
- Register
- Login
- Receive JWT + Refresh Token
- Authenticated requests
- Token refresh
- Logout

---

## 📁 File Storage

All user-uploaded files are stored in **Cloudflare R2**.

Used for:
- User avatars
- Post images
- Voice messages

Files are uploaded directly to Cloudflare R2 and served from the configured public bucket/domain.
Replaced avatars, deleted post images and failed voice uploads are cleaned up from the bucket.

---


## 🧪 Local Infrastructure

To run PostgreSQL, Redis, and pgAdmin locally:

```bash
docker compose up -d
```

Default local Redis connection:

- `REDIS_HOST=127.0.0.1`
- `REDIS_PORT=6379`

Production Redis connection:

- `REDIS_URL=redis://...`

Password reset flow stores OTP codes and one-time reset tokens in Redis with TTL (10 minutes each),
so they are no longer persisted in PostgreSQL. Reset tokens are hashed and consumed atomically
through a Lua script, so a token can only be used once.

---

## 🧑‍💻 Development

```bash
# install dependencies
yarn install

# run migrations
npm run migration:run

# start in watch mode
npm run start:dev

# production build
npm run build
npm run start:prod

# lint & format
npm run lint
npm run format
```

The API listens on `PORT` (default `5001`) and Swagger is available at `/api`.

---

## ✅ Tests

Unit tests are written with Jest and live next to the code they cover
(`*.spec.ts` for auth, users, posts, comments, chats, achievements rules and upload utils).

```bash
npm test          # run all specs
npm run test:watch
npm run test:cov  # coverage report in ./coverage
```

---

## 📌 Highlights

- ✅ NestJS Architecture
- ✅ PostgreSQL + TypeORM + Migrations
- ✅ Redis for password reset OTP / tokens
- ✅ JWT Authentication
- ✅ Refresh Tokens
- ✅ Cookie-based Authentication
- ✅ Real-time Chat
- ✅ Voice Messages with waveforms
- ✅ Read receipts & unread counters
- ✅ Socket.IO
- ✅ Achievements system
- ✅ Email OTP codes
- ✅ Password Recovery
- ✅ File Uploads to Cloudflare R2
- ✅ Swagger / OpenAPI documentation
- ✅ Rate limiting
- ✅ DTO Validation
- ✅ Pagination
- ✅ Unit tests with Jest
- ✅ Scalable Modular Structure
- ✅ Environment-based Configuration

---

## 📄 License

This project was created for educational and portfolio purposes.
