# Figma → Klaviyo Plugin

Turn Figma email designs into Klaviyo templates and campaigns — no manual slicing, no copy-pasting HTML.

---

## How It Works

1. **Designer Mode** — AI analyzes your Figma email frame and suggests where to slice it into image sections. You review, adjust, and apply.
2. **Tech Mode** — Uploads each image slice to Klaviyo's CDN, builds the HTML template, and creates the template or campaign in Klaviyo — one click.

The backend runs on Railway. No server setup needed for the team.

---

## Install the Plugin

> **Only requirement: [Docker Desktop](https://www.docker.com/products/docker-desktop/)**
> Git, Node.js, and Python are **not** needed — Docker handles all of them automatically.

### Step 1 — Install Docker Desktop

Download and install from https://www.docker.com/products/docker-desktop/

Open it and wait for the whale icon in your taskbar/menu bar to stop animating — Docker must be running before you continue.

### Step 2 — Download the project

Go to the GitHub repository and click **Code → Download ZIP**.

Unzip the downloaded file. You should now have a folder called `figma-klaviyo` on your machine.

> If you already have Git installed, you can clone instead:
> ```bash
> git clone https://github.com/RFBadmin/figma-klaviyo.git
> ```

### Step 3 — Run the setup script

Open the `figma-klaviyo` folder, then:

**Mac / Linux** — open Terminal inside the folder and run:
```bash
bash setup.sh
```

**Windows** — double-click `setup.bat` inside the folder.

The script will automatically:
1. Install all Node.js dependencies (no Node.js install needed — runs inside Docker)
2. Build the plugin
3. Print the exact file path to load in Figma

> First run takes ~60 seconds while Docker downloads the Node.js image. Every run after that is fast.

### Step 4 — Load in Figma

1. Open **Figma Desktop App** (must be desktop, not browser)
2. **Main Menu (☰) → Plugins → Development → Import plugin from manifest…**
3. Select: `figma-klaviyo/plugin/manifest.json`
4. Plugin appears under **Plugins → Development → Figma to Klaviyo**

That's it. The backend is live on Railway — nothing else to set up.

### Getting updates

When there is a new version, download the ZIP again (or `git pull`), then run the script again:

```bash
bash setup.sh    # Mac/Linux
setup.bat        # Windows
```

---

## Designer Mode — Step by Step

Designer Mode slices your email frame into image sections ready for Klaviyo.

### Prepare your frame

- Email design must be inside a Figma **Frame** that is **500–700px wide**
- Name the frame clearly (e.g. `Black Friday Email 2025`)
- Plugin auto-detects frames of this width on the current page

### Select frames

- **Click a frame on canvas** → plugin shows only that frame
- **Select nothing** → plugin shows all email frames on the page with checkboxes
- Use **All / None** to quickly select or clear everything

### Slice

- Single frame: click **✦ Slice Frame**
- Multiple frames: click **✦ Slice All N Frames**
- AI analyzes the design and places cut lines — a preview panel shows your email with blue dashed lines

### Adjust slices (optional)

| Action | How |
|--------|-----|
| Move a cut line | Drag the blue handle up or down |
| Split a slice in two | Click **+** on the right side of any slice |
| Delete a slice | Click **✕** on the slice label |
| Rename a slice | Double-click the slice label |
| Re-run AI | Click **↻ Re-analyze** |

> If you draw Figma **Slice** rectangles manually on the frame, the plugin detects and uses them automatically — no AI needed.

### Compression settings

Configure before applying (applies to all frames):

- **Output Format:** Auto (recommended) / JPEG / PNG / WebP
- **Quality:** 50–100% — higher = sharper image, larger file size
- **Max size per slice:** 50 KB – 5 MB

### Apply & push

Click **✦ Apply, Compress & Push All N Frames to Klaviyo →**

The plugin:
1. Writes slice boundaries to the Figma canvas as Slice nodes
2. Exports and compresses each image
3. Saves slice data to the frame
4. Switches to Tech Mode automatically

---

## Tech Mode — Step by Step

Tech Mode pushes the prepared email to Klaviyo as a template or campaign.

### Enter your Klaviyo API key

First use only:
1. Click the **Tech** tab
2. Enter your Klaviyo **Private API Key** (starts with `pk_`)
3. Click **Save & Continue**

The key is stored locally in Figma — never sent to any external server.

> **To get your key:** Klaviyo → Account (bottom-left avatar) → Settings → API Keys → Create Private API Key
>
> Required scopes: **Templates** (Full Access) · **Campaigns** (Full Access) · **Lists** (Read-only)

### Review slice configuration

A table shows every slice across all pushed frames. For each slice:

- **Alt Text** — screen reader description (accessibility best practice)
- **Link** — URL that opens when the image is clicked in the email (leave blank for no link)

### Choose mode

**Template only** — creates a reusable template in Klaviyo:
- Enter a Template Name

**Template + Campaign** — creates a template and schedules a campaign:
- Template Name, Campaign Name, Subject Line, Preview Text
- From Name + From Email
- Select the List to send to
- Optional: set a Send Time (leave blank to save as draft)

### Preview HTML (optional)

Click **Preview HTML** to see exactly how the email renders before touching Klaviyo.

### Push

Click **Push to Klaviyo →**

The plugin:
1. Uploads each slice image to Klaviyo's CDN
2. Builds the HTML email template
3. Creates the template in Klaviyo
4. Creates the campaign (if campaign mode selected)

On success:
- **View Template →** — opens the template in Klaviyo's drag & drop editor
- **View Campaign →** — opens the campaign in Klaviyo

> **Important:** Always use the **View Template →** link from the plugin. Opening the template directly from Klaviyo's website (Content → Templates) may open the HTML editor instead — this is Klaviyo's behaviour, not a plugin bug.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Script says "Docker is not running" | Open Docker Desktop and wait for the whale icon to stop animating, then run again |
| Script says "Clone failed" | Check your internet connection and try again |
| Plugin not appearing in Figma | Re-import — make sure you selected `manifest.json`, not `package.json` |
| "No email frames found" | Frame must be between 500–700px wide |
| Slicing spinner never stops | Railway backend may be cold-starting — wait 30s and click Slice again |
| Klaviyo push fails with auth error | Key must start with `pk_` and have Templates + Campaigns write access |
| Template opens in HTML editor on Klaviyo website | Use the **View Template →** link from the plugin instead of navigating manually |
| Frame shows "sliced" but no slice nodes on canvas | Re-open the plugin — it will detect and reset the stale state automatically |

---

## For Developers — Local Backend

The team does **not** need this. Only relevant when making changes to the backend code.

```bash
# Copy env template and fill in your Anthropic API key
cp backend/.env.example backend/.env

# Start backend locally
docker compose up backend
# → Running on http://localhost:8080

# Stop
docker compose down
```

> Apple Silicon (M1/M2/M3): works natively — Docker Desktop handles ARM64 automatically.

---

## Project Structure

```
figma-klaviyo/
├── plugin/                 # Figma plugin (Preact + TypeScript)
│   ├── src/
│   │   ├── code.ts         # Plugin sandbox (runs inside Figma)
│   │   ├── ui.tsx          # Plugin UI entry point
│   │   └── components/     # DesignerMode, TechMode, KlaviyoConfig
│   ├── dist/               # Compiled output (committed to repo)
│   └── manifest.json       # Figma plugin manifest — load this in Figma
├── backend/                # Flask + Python API
│   ├── app.py
│   ├── routes/
│   ├── services/
│   └── Dockerfile
├── setup.sh                # One-click setup — Mac/Linux
├── setup.bat               # One-click setup — Windows
├── docker-compose.yml      # build-plugin + backend services
├── Dockerfile              # Railway deployment
└── railway.toml            # Railway config
```
