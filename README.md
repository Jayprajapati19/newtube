# 📺 NextTube

NextTube is a full-stack, YouTube-inspired video sharing platform built using the latest technologies including **Next.js 15**, **React 19**, **PostgreSQL**, **tRPC**, and **Mux**.

This project demonstrates modern web development best practices such as modular architecture, real-time video processing, AI integrations, and a rich user experience.

---

## 🚀 Tech Stack

- **Next.js 15**
- **React 19**
- **TailwindCSS + ShadcnUI**
- **PostgreSQL + DrizzleORM**
- **tRPC** (type-safe API)
- **Clerk Authentication**
- **Mux** for video streaming
- **Upstash Redis**
- **OpenAI, Gemini** (for AI functionality)
- **UploadThing** (file uploads)



## ⚙️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Jayprajapati19/newtube.git
cd newtube
```

### 2. Install Dependencies (via Bun)

```bash
bun install
```

### 3. Setup Environment Variables

Create a `.env` file and copy from `.env.example`:

```bash
cp .env.example .env
```

Fill in your actual API keys and values inside `.env`.

---

## 🧪 Database Setup (Drizzle ORM + PostgreSQL)

### Push Schema to Database

```bash
bunx drizzle-kit push
```

### (Optional) View Drizzle Studio

```bash
bunx drizzle-kit studio
```

---

## 🧵 Start Development Server

```bash
bun run dev
```

Project runs at: [http://localhost:3000](http://localhost:3000)

---

## 📄 .env.example

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
CLERK_SIGNING_SECRET=""

# PostgreSQL
DATABASE_URL=""

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Mux
MUX_TOKEN_ID=""
MUX_TOKEN_SECRET=""
MUX_WEBHOOK_SECRET=""

# UploadThing
UPLOADTHING_TOKEN=""

# QStash (Upstash Queueing)
QSTASH_URL=""
QSTASH_TOKEN=""
QSTASH_CURRENT_SIGNING_KEY=""
QSTASH_NEXT_SIGNING_KEY=""
UPSTASH_WORKFLOW_URL=""

# AI APIs
GEMINI_API_KEY=""

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
VERCEL_URL="http://localhost:3000"
```

---

## 🔥 Key Features

- Full video CRUD with AI-powered titles & descriptions
- Smart thumbnail generation and transcription
- Watch history, playlists, likes & subscriptions
- Advanced video player with quality options
- Creator dashboard with analytics
- Fully responsive design
- Authentication via Clerk
- Redis caching & background job queue (QStash)
- Modular and scalable codebase

---

## 📬 Author

**Jay Prajapati**  
GitHub: [@Jayprajapati19](https://github.com/Jayprajapati19)

---

## 💡 Contributions

Have suggestions or improvements? PRs are welcome!  
Let’s build, break, and learn together!

---

## 🏷️ Popular Hashtags

`#NextJS` `#ReactJS` `#PostgreSQL` `#FullStack` `#OpenSource` `#VideoPlatform` `#AI` `#Mux` `#Bun` `#WebDev`