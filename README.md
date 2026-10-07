# IT Software Installation Checklist System (FORM-IT-004.00)

A web-based IT Software Installation Checklist application designed for tracking laptop and desktop/CPU preparation, following the exact **FORM-IT-004.00** standard layout with print-ready A4 generation.

---

## 🚀 Features

- **Standardized Stages**: Tracks installation progress across the exact 5 sections:
  - **FIRST**: Time Zone Setting, UAC, Windows Update, Windows Activation, Computer Name/Domain, Network/IP Configuration
  - **SECOND**: Rocketchat, 7-Zip, Firefox, Acrobat Reader, TeamViewer, AnyDesk, MS Office 2021, Google Chrome, VLC, Notepad++
  - **THIRD**: Printer Driver, Scanner Driver, Biometric/Fingerprint Driver, Company Software / ERP, POS Software, Accounting Software
  - **FOURTH**: Shared Folder / Network Drive, Email Configuration, VPN Client, Remote Desktop (RDP), User Account Creation
  - **FINAL**: Easy Drivers / Driver Pack, HDD/SSD Serial Number, Anti-Virus Installation, Anti-Virus Update & Scan, Disk Cleanup, Final Restart & Verification
- **Exact Printable FORM-IT-004.00**:
  - Pixel-perfect reproduction of the physical document
  - Includes Header block, IT Department logo, Form revision meta, Computer Information table, Checkmark table with No./Item/Installed/Remarks, and Sign-off signatures (Install by, Prepared by, Check by, Approved by)
  - One-click **"Print / Save PDF"** button formatted for standard A4 portrait paper
- **Role-Based Workflow**:
  - **INSTALLER**: Fills in computer information and checks off completed software
  - **CHECKER**: Reviews and validates checklist
  - **APPROVER / ADMIN**: Gives final approval or rejects with notes
- **Cloud-Ready Architecture**:
  - **Next.js (App Router)** + **Tailwind CSS**
  - **NextAuth.js v5** (JWT Session auth)
  - **Prisma ORM** with TiDB / MySQL compatibility
  - **Docker** support for **Koyeb** serverless deployment

---

## 🛠️ Step-by-Step Setup Guide

### 1. Set Up TiDB Cloud Database (Free)

1. Go to [TiDB Cloud](https://tidbcloud.com/) and register or log in.
2. Click **Create Cluster** and select **TiDB Serverless** (Free tier).
3. Choose your region (e.g., Singapore / `ap-southeast-1` or closest to your users).
4. In your cluster dashboard, click **Connect**.
5. Select **Prisma** or **General (MySQL)** as the connection type.
6. Copy the connection string. It will look like this:
   ```env
   DATABASE_URL="mysql://<username>.<prefix>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/<database_name>?sslaccept=strict"
   ```

---

### 2. Local Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Paste your TiDB connection string into `DATABASE_URL`.
3. Generate a secure secret for `AUTH_SECRET`:
   ```bash
   # On Linux/macOS or Git Bash:
   openssl rand -base64 32
   ```
4. Push the Prisma schema to your TiDB database:
   ```bash
   npx prisma db push
   ```
5. Seed the database with initial software items and admin user:
   ```bash
   npm run db:seed
   ```
   > **Default Admin Account**:
   > - Username: `admin`
   > - Password: `ChangeMe123!` *(Change immediately after first login)*

6. Run the local development server:
   ```bash
   npm run dev
   ```
7. Visit `http://localhost:3000` in your browser.

---

### 3. Push to GitHub

1. Initialize git (if not already done) and stage files:
   ```bash
   git add .
   git commit -m "feat: complete online checklist system and FORM-IT-004.00 printable layout"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Link and push to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

---

### 4. Deploy to Koyeb

1. Sign up or log in at [Koyeb](https://app.koyeb.com/).
2. Click **Create Service** and select **GitHub**.
3. Authorize Koyeb to access your GitHub account and select your checklist repository.
4. Set the **Build type**:
   - Choose **Dockerfile** (the repository includes an optimized multi-stage `Dockerfile`).
5. In **Environment Variables**, add:
   - `DATABASE_URL`: Your TiDB Cloud connection string
   - `AUTH_SECRET`: A secure 32+ character random string
   - `NEXTAUTH_URL`: `https://<your-app-name>.koyeb.app`
6. Set the **Port**:
   - Internal Port: `3000` (Path: `/`)
7. Click **Deploy**.
8. Koyeb will automatically build the Docker image, run `npx prisma db push` on start, and launch your live service with free SSL!

---

## 📄 Form Structure (FORM-IT-004.00)

| Field | Description |
|---|---|
| **Branch / Dept.** | Branch location or department name |
| **Date** | Date of installation / configuration |
| **Computer Name** | Assigned workstation hostname (e.g., `LAPTOP-IT-01`) |
| **O.S.** | Windows version (11 Pro, 10 Pro, Server, etc.) |
| **HDD/SSD Serial** | Storage drive hardware serial number |
| **Install by** | Name of the IT technician who performed installations |
| **Prepared by** | Name of the person who prepared the unit |
| **Check by** | IT Checker / Supervisor validator |
| **Approved by** | IT Manager / Department Head approval |

---

## 🖨️ Printing & PDF Export

1. Open any completed checklist from the dashboard or list view.
2. Click **🖨 Print**.
3. The page renders the official **FORM-IT-004.00** document.
4. Click **Print / Save PDF** or press `Ctrl + P`.
5. Select **Destination: Save as PDF** or send directly to an office printer.
