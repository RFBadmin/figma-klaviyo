# Figma → Klaviyo — Install Guide

> **Only prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/)**
> No Git, Node.js, or Python needed on your machine.

---

## Step 1 — Get the project files

Download the ZIP from GitHub and unzip it to your Desktop.

> Or, if you have Git installed:
> ```bash
> git clone https://github.com/RFBadmin/figma-klaviyo.git
> ```

---

## Step 2 — Build the plugin

Open the project folder, then:

**Mac / Linux** — open Terminal in the project folder and run:
```bash
bash setup.sh
```

**Windows** — double-click `setup.bat`

The script will:
- Check Docker Desktop is running
- Download Node.js automatically (inside Docker — nothing installed on your machine)
- Compile the plugin
- Print the exact file path you need for Figma

> First run takes ~30 seconds to download the Node.js image. Subsequent runs are instant

---

## Step 3 — Load in Figma

1. Open **Figma Desktop App** (must be desktop, not browser)
2. Open any Figma file
3. Go to **Main Menu (☰) → Plugins → Development → Import plugin from manifest…**
4. Select the file: `figma-klaviyo/plugin/manifest.json`
5. The plugin now appears under **Plugins → Development → Figma to Klaviyo**

**That's it.** The backend runs on Railway — no server setup needed.

---

## After a code update

Pull the latest changes and re-run setup:

```bash
git pull
bash setup.sh      # Mac/Linux
```
```
setup.bat          # Windows
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to Docker daemon` | Open Docker Desktop and wait for the whale icon to stop animating |
| Script says "Build failed" | Check the terminal output — usually a network issue; try again |
| Plugin not appearing in Figma menu | Re-run the import step and make sure you selected `manifest.json` (not `package.json`) |
| "No email frames found" in plugin | Your Figma frame must be between **500–700px wide** |
| Slicing spinner never stops | Railway backend may be cold-starting — wait 30 seconds and click Slice again |
| Klaviyo push fails with auth error | Check your API key starts with `pk_` and has Templates + Campaigns write access |

---

## For developers only — run backend locally

The team does **not** need this. Only use if you are making changes to the backend code.

```bash
# Copy env template and add your Anthropic API key
cp backend/.env.example backend/.env

# Start backend
docker compose up backend
# → Running on http://localhost:8080
```
