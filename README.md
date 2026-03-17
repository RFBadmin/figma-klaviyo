# Figma → Klaviyo Plugin — Setup & Usage Guide

> Complete installation and usage instructions for designers and the Klaviyo team.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install Git](#1-install-git)
3. [Install Node.js](#2-install-nodejs)
4. [Clone the Repository](#3-clone-the-repository)
5. [Build the Plugin](#4-build-the-plugin)
6. [Load the Plugin in Figma](#5-load-the-plugin-in-figma)
7. [Backend Setup (Dev Only)](#6-backend-setup-dev-only)
8. [Using the Plugin — Designer Mode](#7-using-the-plugin--designer-mode)
9. [Using the Plugin — Tech Mode](#8-using-the-plugin--tech-mode)
10. [Klaviyo API Key Setup](#9-klaviyo-api-key-setup)
11. [Troubleshooting](#troubleshooting)
12. [Quick Reference — Terminal Commands](#quick-reference--terminal-commands)

---

## Prerequisites

You need the following installed on your machine:

| Tool | Required Version | Download |
|------|-----------------|----------|
| Git | Any recent version | https://git-scm.com/downloads |
| Node.js | 18 or 20 (LTS) | https://nodejs.org |
| Figma Desktop App | Latest | https://www.figma.com/downloads |
| Python | 3.12+ (backend/dev only) | https://www.python.org/downloads |

---

## 1. Install Git

**macOS:**
```bash
# Check if already installed
git --version

# Install via Homebrew (if not installed)
brew install git
```

**Windows:**
Download and run the installer from https://git-scm.com/downloads
During install, choose **"Git Bash"** and **"Use Git from the command line"**.

**Verify:**
```bash
git --version
# Expected: git version 2.x.x
```

---

## 2. Install Node.js

Download **Node.js v20 LTS** from https://nodejs.org

**Verify after installing:**
```bash
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x
```

---

## 3. Clone the Repository

Open **Terminal** (macOS) or **Git Bash** / **Command Prompt** (Windows):

```bash
# Navigate to where you want the project saved
cd ~/Desktop

# Clone the repository
git clone https://github.com/RFBadmin/figma-klaviyo.git

# Enter the project folder
cd figma-klaviyo
```

To get the latest changes in the future:
```bash
cd figma-klaviyo
git pull origin main
```

---

## 4. Build the Plugin

> The `dist/` folder is already committed to the repo — **you do NOT need to rebuild unless you make code changes.**
> If you just want to use the plugin, skip to step 5.

To install dependencies and build from source:

```bash
# Make sure you are inside the plugin folder
cd figma-klaviyo/plugin

# Install dependencies
npm install

# Build once (creates dist/code.js and dist/ui.html)
npm run build

# OR — watch for file changes during development
npm run dev
```

After building, confirm these two files exist:
```
plugin/dist/code.js
plugin/dist/ui.html
```

---

## 5. Load the Plugin in Figma

> You must use the **Figma Desktop App** — the browser version does not support development plugins.

1. Open **Figma Desktop App**
2. Open any Figma file
3. Go to **Main Menu (☰) → Plugins → Development → Import plugin from manifest…**
4. In the file picker, navigate to your cloned folder and select:
   ```
   figma-klaviyo/plugin/manifest.json
   ```
5. The plugin **"Figma → Klaviyo"** now appears under **Plugins → Development**

**To run the plugin:**
- **Main Menu → Plugins → Development → Figma → Klaviyo**
- Or **right-click** on the Figma canvas → **Plugins → Development → Figma → Klaviyo**

**To re-open after closing:**
Same steps above — or use the keyboard shortcut shown next to the plugin name in the menu.

---

## 6. Backend Setup (Dev Only)

> **Skip this section if you are using the hosted backend.**
> The plugin is pre-configured to use the production backend at:
> `https://figma-klaviyo-production.up.railway.app`
>
> No backend setup is needed for designers or the Klaviyo team — the backend runs in the cloud.

If you need to run the backend locally (developers only):

```bash
# Navigate to the backend folder
cd figma-klaviyo/backend

# Create a Python virtual environment
python -m venv .venv

# Activate it:
# macOS / Linux:
source .venv/bin/activate

# Windows (Command Prompt):
.venv\Scripts\activate

# Windows (Git Bash):
source .venv/Scripts/activate

# Install Python dependencies
pip install -r requirements.txt

# Copy the example env file
cp .env.example .env
```

Open `.env` in any text editor and fill in your keys:
```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
BASE_URL=http://localhost:8080
FLASK_DEBUG=1
```

Start the backend server:
```bash
python app.py
# Server now running on http://localhost:8080
```

---

## 7. Using the Plugin — Designer Mode

Designer Mode is for the **design team**. It slices the email frame into image sections and prepares them for Klaviyo.

### Step 1 — Prepare your Figma frame

- Your email design must be inside a **Frame** that is **500–700px wide**
- Name your frame clearly (e.g. `Black Friday Email 2025`)
- The plugin auto-detects frames of this width on the current page

### Step 2 — Open the plugin and select frames

- **Select a frame on canvas first** → plugin shows only that frame
- **Select nothing** → plugin shows all email frames on the page with checkboxes
- Use the checkboxes to choose which frames to process
- Click **All** or **None** to quickly check/uncheck everything

### Step 3 — Slice the frames

- Single frame: click **✦ Slice Frame**
- Multiple frames: click **✦ Slice All N Frames**
- The AI analyzes your design and suggests where to cut the email into image slices
- A preview panel appears showing your email with **blue dashed cut lines**

### Step 4 — Adjust slices (optional)

In the preview panel:

| Action | How |
|--------|-----|
| Move a cut line | Drag the **blue handle** up or down |
| Split a slice into two | Click **+** on the right side of any slice |
| Delete a slice | Click **✕** on the slice label |
| Rename a slice | Double-click the slice label |
| Re-run AI slicing | Click **↻ Re-analyze** |

### Step 5 — Using Figma native slice nodes (optional)

If you draw **Slice** rectangles manually using Figma's Slice tool on a frame, the plugin detects and uses them automatically — no AI analysis needed.

### Step 6 — Compression Settings

Before applying, configure the compression settings (applies to **all frames**):

- **Output Format:** Auto (recommended) / JPEG / PNG / WebP
- **Quality:** 50–100% slider — higher means sharper but larger files
- **Max size per slice:** 50 KB – 5 MB limit per image

### Step 7 — Apply, Compress & Push to Klaviyo

Click **✦ Apply, Compress & Push All N Frames to Klaviyo →**

The plugin will:
1. Apply the slice boundaries to the Figma canvas as Slice nodes
2. Export and compress each slice image
3. Save everything to the frame
4. Automatically switch to **Tech Mode**

---

## 8. Using the Plugin — Tech Mode

Tech Mode is for the **tech / Klaviyo team**. It pushes the prepared email to Klaviyo as a template or campaign.

### Step 1 — Enter your Klaviyo API key

On first use:
1. Click the **Tech 🔒** tab
2. Enter your Klaviyo **Private API Key** (starts with `pk_`)
   See [Section 9](#9-klaviyo-api-key-setup) for how to get this key
3. Click **Save Key**

Your key is stored locally in Figma — it is never stored on any server except Klaviyo's own API.

### Step 2 — Review slice configuration

A table shows all slices across all pushed frames. For each slice, you can set:

- **Alt Text** — screen reader description for accessibility (required for good email practice)
- **Link** — URL that opens when the image is clicked in the email (leave blank for no link)

### Step 3 — Choose mode: Template or Campaign

**Template only** (creates a reusable template in Klaviyo):
- Enter a **Template Name**

**Template + Campaign** (creates a template AND schedules/sends a campaign):
- Template Name
- Campaign Name
- Subject Line
- Preview Text
- From Name + From Email
- Select the **List** to send to
- Optional: set a **Send Time** (leave blank to save as draft)

### Step 4 — Preview HTML (optional)

Click **Preview HTML** to see exactly how the email will render before sending anything to Klaviyo.

### Step 5 — Push to Klaviyo

Click **Push to Klaviyo**.

The plugin will:
1. Upload each slice image to Klaviyo's CDN
2. Build the HTML email template
3. Create the template in Klaviyo
4. Create the campaign (if campaign mode selected)

On success you'll see:
- **View Template →** — opens the template in Klaviyo's drag & drop editor
- **View Campaign →** — opens the campaign in Klaviyo (campaign mode only)

> **Important:** Always use the **View Template →** link from the plugin to open the template in drag & drop mode. Opening the template directly from Klaviyo's Content → Templates page may show the HTML editor instead — this is a Klaviyo website behaviour, not a plugin issue.

---

## 9. Klaviyo API Key Setup

1. Log in to your Klaviyo account at https://www.klaviyo.com
2. Go to **Account (bottom-left avatar) → Settings → API Keys**
3. Click **Create Private API Key**
4. Give it a name (e.g. `Figma Plugin`)
5. Set these scopes:

   | Scope | Permission |
   |-------|-----------|
   | Templates | Full Access |
   | Campaigns | Full Access |
   | Lists | Read-only |

6. Click **Create**
7. Copy the key — it starts with `pk_`
8. Paste it into the plugin: **Tech Mode → API Key field → Save Key**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin not appearing in Figma | Make sure you imported `manifest.json`, not `package.json` |
| "No email frames found" | Ensure your frame is between 500–700px wide |
| Slicing spinner never stops | Check your internet connection; the backend may be cold-starting (wait 30s and retry) |
| Klaviyo push fails with auth error | Verify your API key starts with `pk_` and has Templates + Campaigns write access |
| Template opens in HTML editor on Klaviyo website | Use the **View Template →** link from the plugin instead of navigating manually |
| `npm run build` fails | Delete `plugin/node_modules`, run `npm install` again, then `npm run build` |
| `python app.py` fails | Make sure virtual environment is activated and `pip install -r requirements.txt` completed |
| Frame shows "sliced" but no slice nodes on canvas | Delete the frame's plugin data: re-open plugin, the state will reset automatically |

---

## Quick Reference — Terminal Commands

```bash
# ── First-time setup ────────────────────────────────────────────────────────

# Clone the repository
git clone https://github.com/RFBadmin/figma-klaviyo.git
cd figma-klaviyo

# Build the plugin (only needed if making code changes)
cd plugin
npm install
npm run build

# ── Day-to-day ───────────────────────────────────────────────────────────────

# Get latest changes from the repo
git pull origin main

# Rebuild after pulling changes
cd plugin && npm run build

# Watch mode (auto-rebuilds on save — for developers)
cd plugin && npm run dev

# ── Backend (local dev only) ─────────────────────────────────────────────────

cd figma-klaviyo/backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# or: .venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
# → Running on http://localhost:8080
```
