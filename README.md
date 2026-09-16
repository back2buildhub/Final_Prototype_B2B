# 🏗️ Back2Build — Demo

> **Sri Lanka's Trusted Construction Marketplace**
> A full-stack construction marketplace connecting property owners with verified constructors through secure escrow payments, real-time messaging, and an intelligent AI-powered construction assistant.

---

## ✨ Features

### 🏠 Property Owner
- Register and create direct or bidding construction projects
- Browse constructor applications and assign the best one
- Secure escrow payment system — 50% deposit on assignment
- Release milestone payments after approving daily progress updates
- Mark projects as completed when all work is done
- Add more funds to escrow at any time from the profile page
- Real-time messaging with assigned constructors
- Full transaction history and audit trail
- Bass AI construction assistant with project context awareness

### 🏗️ Constructor
- Browse and apply to available projects
- Submit daily progress updates with payment release requests
- Track escrow balance and earnings in real time
- Withdraw earnings with a printable receipt
- Real-time messaging with property owners
- Bass AI for bid writing, material calculations, and progress reports

### 🤖 Bass AI — Intelligent Construction Assistant

Powered by **Groq** (llama-3.3-70b-versatile) with a multi-layer AI architecture:

**Intent Routing:**
Bass AI detects the purpose of every message and selects a specialized prompt automatically

| Detected Intent | Specialized Mode |
|---|---|
| bid, proposal, quotation | Bid Proposal Writer |
| estimate, cost, price, budget | Cost Estimator |
| tiles, cement, quantity, sq ft | Material Calculator |
| progress report, daily report | Progress Report Generator |
| invoice, bill, receipt | Invoice Assistant |
| anything else | General Construction Q&A |

**Role Awareness:**
Every response is tailored based on whether the user is a Property Owner or Constructor — same question, different perspective

**Project Context Injection:**
When launched from a specific project card, Bass AI automatically loads the project's title, budget, city, service type, escrow balance, and progress data. Responses become project-specific instead of generic. A green **📁 Project Aware** badge appears on every context-aware response

**Follow-up Suggestions:**
After every AI response, a second lightweight Groq call generates 3 clickable follow-up questions relevant to what was just discussed. Clicking any chip fires it as the next message instantly

**Persistent Chat History:**
All conversations are saved to Supabase. A left sidebar shows all past chats which can be reopened and continued at any time. Each conversation is auto-titled from the first message

### 💰 Simulated Escrow Payment System
- Internal ledger — no real bank needed, all logic in PostgreSQL
- 50% deposit automatically moved to escrow on constructor assignment
- Milestone-based payment releases approved by the property owner
- 5% platform commission deducted on every release
- Full transaction audit trail with unique transaction codes
- Printable withdrawal receipts for constructors

### 💬 Real-time Messaging
- Project-linked conversations between owner and constructor
- Auto-creates conversation on first message click
- Supabase Realtime for instant message delivery
- Available across all project states — pending, ongoing, completed
- Accessible from project cards and from the messages sidebar

### 🔄 Account Switcher
- One-click switching between registered accounts in the sidebar
- No logout or login required during demo

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + React 19 |
| Styling | Inline styles — dark navy and orange theme |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| AI Inference | Groq API (llama-3.3-70b-versatile) |
| Payments | Simulated Internal Ledger |

---

## 📁 Project Structure

```
b2b-fresh/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── login/                          # Login page
│   ├── register/                       # Registration with role selection
│   ├── owner/
│   │   ├── page.tsx                    # Dashboard — wallet, stats, recent projects
│   │   ├── projects/                   # Project management, escrow, progress, completion
│   │   ├── create-project/             # Create direct or bidding projects
│   │   ├── messages/                   # Real-time messaging with constructors
│   │   ├── ai/                         # Bass AI — full chat interface with sidebar
│   │   └── profile/                    # Edit profile, escrow top-up, transaction history
│   ├── constructor/
│   │   ├── page.tsx                    # Dashboard — earnings, projects, stats
│   │   ├── projects/                   # Browse projects, apply, submit progress
│   │   ├── messages/                   # Real-time messaging with property owners
│   │   ├── ai/                         # Bass AI — full chat interface with sidebar
│   │   └── profile/                    # Edit profile, withdraw earnings, print receipt
│   └── api/
│       ├── ai/chat/                    # Groq AI route — intent routing + follow-ups
│       ├── escrow/deposit/             # Assign constructor and deposit 50% to escrow
│       ├── escrow/release/             # Release milestone payment to constructor
│       ├── escrow/topup/               # Add more funds to project escrow
│       ├── wallet/topup/               # Demo wallet top-up
│       └── wallet/withdraw/            # Constructor withdrawal and receipt generation
├── lib/
│   ├── groq.ts                         # Groq client, prompt router, follow-up generator
│   ├── supabase.ts                     # Supabase client and helpers
│   ├── accounts.ts                     # Account switcher helpers
│   ├── data.tsx                        # Shared style objects and mock data
│   └── ai/
│       ├── intentRouter.ts             # Intent detection, role types, ProjectContext type
│       └── prompts/
│           ├── system.ts               # General construction Q&A prompt
│           ├── proposal.ts             # Bid proposal writer prompt
│           ├── estimate.ts             # Cost estimator prompt
│           ├── material.ts             # Material calculator prompt
│           ├── progress.ts             # Progress report generator prompt
│           └── invoice.ts              # Invoice assistant prompt
├── components/
│   └── AccountSwitcher.tsx             # One-click account switching in sidebar
├── database.sql                        # Full database setup — run once in Supabase
└── fix_conversations_policy.sql        # RLS policy fix for conversations table
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- A [Supabase](https://supabase.com) account — free
- A [Groq](https://console.groq.com) account — free

---

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

---

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor → New Query**
3. Paste the full contents of `database.sql` and click **Run**
4. Create another new query, paste `fix_conversations_policy.sql` and click **Run**
5. Go to **Authentication → Providers → Email** and turn OFF **Confirm email**
6. Go to **Settings → API** and copy:
   - Project URL
   - anon public key
   - service_role key

---

### 3. Set up Groq

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google
3. Go to **API Keys → Create API Key**
4. Copy the key — starts with `gsk_`

---

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
GROQ_API_KEY=gsk_your-groq-key-here
```

---

### 5. Run the project

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎮 Demo Flow

1. **Register** as a Property Owner — starts with LKR 100,000 demo wallet
2. **Create a project** — choose direct or bidding type
3. Open an **incognito window** and register as a Constructor
4. Constructor **browses available projects** and clicks Apply
5. Switch back to Property Owner — **assign the constructor** — 50% moves to escrow automatically
6. Switch to Constructor — **submit a progress update**
7. Switch to Owner — **approve and release payment** — constructor wallet updates instantly
8. Both parties can **message each other** in real time from any project state
9. Click **🤖 Ask Bass AI** on any project card — AI loads the project context automatically
10. Ask Bass AI anything — watch the **mode badge** switch between specializations
11. Click any **follow-up suggestion chip** to continue the conversation intelligently
12. Constructor **withdraws earnings** and gets a printable receipt
13. Owner **marks the project as completed** when all work is done
14. Use the **Account Switcher** in the sidebar to jump between accounts instantly

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User info and role (property_owner or constructor) |
| `wallets` | Simulated money balances — one per user |
| `projects` | Construction projects with status tracking |
| `project_applications` | Constructor applications to projects |
| `project_escrows` | Per-project escrow wallets |
| `wallet_transactions` | Every money movement — full audit trail |
| `progress_updates` | Constructor daily updates with payment requests |
| `conversations` | Message threads — one per project pair |
| `messages` | Individual chat messages with real-time support |
| `ai_conversations` | Bass AI chat sessions with titles |
| `ai_messages` | Bass AI message history per conversation |

---

## 🤖 Bass AI Architecture

```
User sends a message
        ↓
Intent Router (intentRouter.ts)
Detects: proposal / estimate / material / progress / invoice / general
        ↓
Role Context Added
property_owner → owner-specific framing
constructor    → professional framing
        ↓
Project Context Injected (if launched from a project card)
Title, budget, city, service, escrow balance, progress
        ↓
Specialized Prompt Selected from prompts/ folder
        ↓
Primary Groq Call — main answer generated
        ↓
Secondary Groq Call — 3 follow-up questions generated
        ↓
Response returned with:
reply + intent + intentLabel + isProjectAware + followUps
        ↓
UI renders:
BASS AI badge + Mode badge + Project Aware badge (if applicable)
Formatted response with orange titles and numbered steps
3 clickable follow-up suggestion chips
```

---

## 💳 Payment Flow

```
Owner wallet:  LKR 100,000
               ↓
Create project — LKR 50,000 budget
               ↓
Assign constructor → 50% (LKR 25,000) moves to escrow automatically
               ↓
Constructor submits progress update
               ↓
Owner releases LKR 10,000
               ↓
Platform takes 5% commission = LKR 500
Constructor receives LKR 9,500
               ↓
Constructor withdraws → printable receipt generated
               ↓
Owner marks project as completed
```

---

## 📝 Notes

- This is a **university demo project** — no real money is transferred
- The escrow system uses a simulated internal ledger stored in PostgreSQL
- In a production deployment the ledger would connect to a licensed payment gateway such as Stripe Connect
- Bass AI uses Groq free tier and is subject to rate limits
- All wallet balances reset if the Supabase database is cleared

---

## 👨‍💻 Built With

- **Next.js 15** — React framework with App Router
- **Supabase** — PostgreSQL database, authentication, and real-time subscriptions
- **Groq** — Ultra-fast AI inference engine
- **Llama 3.3 70B** — Open source large language model by Meta

---

> *Back2Build — Where Trust Builds* 🏗️
