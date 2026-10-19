# AirFi Ops — Airport Pocket Wi-Fi & Fleet Logistics ERP

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![n8n](https://img.shields.io/badge/Automation-n8n-FF6D5A?style=for-the-badge&logo=n8n)](https://n8n.io/)

> **AirFi Ops** is an enterprise-grade operations platform designed for international airport kiosks to streamline pocket Wi-Fi rentals, automate terminal asset logistics, and execute transparent deposit settlements via event-driven workflows.

---

## 📌 Executive Summary & Case Study

### Background & Problem Statement
Operating pocket Wi-Fi and mobile connectivity kiosks at busy international airport terminals (e.g., Soekarno-Hatta, Juanda, Ngurah Rai) involves high foot-traffic and rapid turnaround windows. Operations teams face three recurring bottlenecks:
1. **Manual Return & Friction in Deposit Refunds**: Staff manually tally physical accessories (charging cables, adapters, protective pouches), calculate penalty fees, and process refunds through tedious back-office spreadsheets.
2. **Device Fleet Fragmentation**: Risk of inventory conflicts and overbooking between departure and arrival booths across different airport terminals.
3. **Audit Visibility**: Lack of real-time audit trails recording hardware damage penalties, customer communications, and financial reconciliation.

### The Solution: AirFi Ops
AirFi Ops digitizes and automates the entire device lifecycle from dispatch to post-rental inspection:
- **Instant Booking & Payment Escrow**: Seamless reservation tied to airport terminal booths, integrating **Midtrans Snap** for rental payments and security deposit holds.
- **Real-Time Fleet Tracking**: Live monitoring of hardware inventory (IMEI, serial numbers, hardware models) across airport terminal locations with status progression (AVAILABLE, IN_USE, MAINTENANCE, DAMAGED).
- **Fast Return & Automated Inspection Engine**: Point-of-return checklist that computes transparent penalty deductions for missing accessories or physical scratches.
- **Event-Driven Workflow Automation (n8n)**: Return events trigger asynchronous webhook workflows in **n8n**, evaluating business rules, calculating net refunds, and broadcasting incident summaries directly to team communication channels (Discord).

---

## 🏗️ System Architecture

`mermaid
flowchart TD
    subgraph Client ["Airport Booth Staff / Client"]
        UI["AirFi Ops Web Portal (Next.js 16 + React 19)"]
    end

    subgraph CorePlatform ["Core Application Layer"]
        API["Next.js Route Handlers (REST API)"]
        Prisma["Prisma ORM 7"]
        DB[("SQLite Database (dev.db)")]
    end

    subgraph Integrations ["External Services & Automation"]
        Midtrans["Midtrans Payment Gateway (Snap API)"]
        CountriesAPI["REST Countries API (ISO Metadata)"]
        n8n["n8n Automation Engine (Docker)"]
        Discord["Discord Operations Channel"]
    end

    UI -->|Browse & Reserve| API
    UI -->|Checkout & Escrow| Midtrans
    UI -->|Fetch Country Data| CountriesAPI
    API -->|Data Persistence| Prisma
    Prisma --> DB
    API -->|Trigger Return Inspection| n8n
    n8n -->|Post Status Report| Discord
    n8n -->|Return Settlement JSON| API
`

---

## 🚀 Key Modules & Features

### 1. 📋 Booking Desk & Airport Dispatch
- **Dynamic Country & Roaming Lookup**: Integrates with the **REST Countries API** to dynamically pull destination flags, ISO codes, and region data.
- **Terminal Allocation**: Select pickup and dropoff booths (e.g., CGK Terminal 3, SUB Terminal 2, DPS International).
- **Payment Gateway Integration**: Embedded **Midtrans Snap** modal supporting real-time sandbox payments, QRIS, virtual accounts, and auto-sync background polling.

### 2. 📡 Fleet Tracking & Device Lifecycle
- Track 4G & 5G devices by IMEI, serial number, and battery/hardware model.
- Filter assets by operational state: AVAILABLE, IN_USE, MAINTENANCE, or DAMAGED.
- Live booth inventory counters prevent overbooking at airport counters.

### 3. 🔍 Fast-Return & Inspection Desk
- Rapid search for active rentals by Customer Name, Order Number, or Phone.
- Visual checklist for standard kit items:
  - USB-C Fast-Charging Cable (-Rp 50.000 if missing)
  - Hard Shell Travel Pouch (-Rp 50.000 if missing)
  - Dual-Port Wall Charger (-Rp 50.000 if missing)
  - Physical Unit Condition (Good, Scratched, Damaged / -Rp 350.000 penalty)
- Automatic net deposit refund calculation with live price preview.

### 4. ⚡ Automation Engine & Audit Trail (n8n + Discord)
- One-click submission sends the inspection payload to an automated **n8n webhook** (/webhook/airfi-refund).
- **Resilient Fallback**: If the external n8n engine is offline, an internal rule-engine automatically settles the deposit and logs the transaction safely without blocking staff.
- Audit table displays exact deduction breakdowns, net refund amounts, and n8n execution IDs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Shadcn UI |
| **Backend & API** | Next.js API Route Handlers (RESTful architecture) |
| **Database & ORM** | SQLite, Prisma ORM 7 with better-sqlite3 adapter |
| **Payment Gateway** | Midtrans Snap (Sandbox & Demo Simulation Mode) |
| **Workflow Engine** | n8n Automation Engine (Docker containerized) |
| **Containerization** | Docker, Docker Compose |

---

## 💻 Quick Start & Installation

### Option 1: Docker Compose (All-in-One Launch)

Spins up the Next.js web application, seeded database, and containerized n8n engine with preloaded workflows:

`ash
# 1. Clone repository
git clone https://github.com/alterashy/airfi-ops.git
cd airfi-ops

# 2. Launch multi-container environment
docker compose up -d --build
`

Access the services:
- **AirFi Ops Application**: [http://localhost:3000](http://localhost:3000)
- **n8n Automation Engine**: [http://localhost:5678](http://localhost:5678)

---

### Option 2: Local Development Setup (Node.js)

**Prerequisites:** Node.js 20+ and npm.

`ash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Synchronize database and seed sample data
npx prisma db push
npx prisma db seed

# 4. Start development server
npm run dev
`

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note on n8n:** When running without Docker, the application automatically uses its built-in fallback engine for deposit settlements if port 5678 is unreachable.

---

## ⚙️ Environment Variables (.env)

`ini
PORT=3000
DATABASE_URL="file:./dev.db"

# Automation Engine (n8n)
N8N_WEBHOOK_URL="http://localhost:5678/webhook/airfi-refund"

# Midtrans Payment Gateway (Sandbox)
MIDTRANS_SERVER_KEY="SB-Mid-server-YOUR_KEY"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-YOUR_KEY"
MIDTRANS_IS_PRODUCTION=false

# REST Countries API (Optional)
REST_COUNTRIES_API_KEY=""
`

---

## 🧪 End-to-End Walkthrough Scenario

1. **Create an Order**: Navigate to **Booking Desk** -> click **New Order** -> select destination country, dates, and airport booth -> complete payment via Midtrans Snap.
2. **Verify Inventory Allocation**: Switch to **Fleet Tracking** -> observe the assigned device automatically updated to IN_USE.
3. **Execute Return Inspection**: Go to **Return and Inspection Desk** -> pick an active rental -> test missing accessories or damage toggles -> submit return.
4. **Inspect Automated Audit**: Switch to **Automation Logs** -> view the calculated refund amount, deduction breakdown, and n8n webhook status.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
