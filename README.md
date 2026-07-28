# 🚀 Nairo Backend

Backend API for Nairo — a modern social networking platform built with NestJS, TypeScript, PostgreSQL, and Socket.IO.

The server provides authentication, real-time messaging, user management, posts, comments, notifications, and secure API endpoints.

---

## 🌍 Live API

🔗 Swagger: Soon...

🔗 Frontend: https://nairo-frontend-production.up.railway.app/

---

## ✨ Features

### 🔐 Authentication

- User registration
- Login
- JWT Authentication
- Refresh Tokens
- Email verification (OTP)
- Password recovery
- Secure HttpOnly Cookies
- Password hashing with bcrypt

---

### 👤 User Management

- User profiles
- Avatar upload
- Bio editing
- Username validation
- Follow / Unfollow users
- Search users

---

### 📝 Posts

- Create posts
- Upload images
- Edit posts
- Delete posts
- Comments
- Saved posts

---

### 💬 Real-Time Chat

- Private chats
- Real-time messaging
- Typing indicator
- Message history
- Delete chats
- Delete/Edit messages
- Messages notifications on platform

Powered by Socket.IO

---

### 📧 Email

- OTP verification
- Password reset emails
- HTML email templates

---

### 📂 File Uploads

- Avatar uploads
- Post images
- Static file serving

---

### 🛡️ Security

- JWT Authentication
- Refresh Token validation
- Cookie authentication
- Password hashing
- DTO validation
- Environment variables

---

## 🛠️ Tech Stack

### Framework
- NestJS
- TypeScript

### Database
- PostgreSQL
- TypeORM

### Authentication
- JWT
- bcrypt

### Validation
- class-validator

### Realtime
- Socket.IO

### Email
- Resend

### Media Storage
- Cloudflare

### Configuration
- dotenv
- ConfigModule

### Utilities
- Cookie Parser
- UUID

---

## 🗄️ Database

The project uses PostgreSQL with TypeORM.

Features include:

- Entity relationships
- Migrations
- Repository pattern
- UUID primary keys

---

## 📡 API

Main API modules:

- Authentication
- Users
- Posts
- Comments
- Chats
- Messages
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

Files are uploaded directly to Cloudflare R2 and served from the configured public bucket/domain.
---

## 📌 Highlights

- ✅ NestJS Architecture
- ✅ PostgreSQL + TypeORM
- ✅ JWT Authentication
- ✅ Refresh Tokens
- ✅ Cookie-based Authentication
- ✅ Real-time Chat
- ✅ Socket.IO
- ✅ Email Verification
- ✅ Password Recovery
- ✅ File Uploads
- ✅ DTO Validation
- ✅ Scalable Modular Structure
- ✅ Environment-based Configuration

---

## 📄 License

This project was created for educational and portfolio purposes.
