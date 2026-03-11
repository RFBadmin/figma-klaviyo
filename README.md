# Figma to Klaviyo AI Plugin

> Automated email design slicing and Klaviyo deployment — powered by Claude Vision

## Overview

This Figma plugin automates the process of converting email designs into Klaviyo-ready campaigns. It replaces manual slicing with AI-powered segmentation and provides a seamless two-team workflow for designers and tech teams.

### Key Features

- **AI-Powered Auto-Slicing**: Claude Vision analyzes email designs and identifies optimal slice boundaries
- **Interactive Preview**: Designers can adjust slice boundaries before finalizing
- **Squoosh Compression**: Google's Squoosh CLI for optimal image compression
- **Dual-Mode Interface**: Separate workflows for Design and Tech teams
- **Google OAuth**: Secure authentication for Klaviyo access
- **Flexible Deployment**: Push to Klaviyo as Template or Campaign

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FIGMA PLUGIN                                     │
├───────────────────────────────────┬─────────────────────────────────────────┤
│         DESIGNER MODE             │              TECH MODE                  │
│       (No login required)         │       (Google OAuth required)           │
├───────────────────────────────────┼─────────────────────────────────────────┤
│  • Select email frame             │  • Load sliced design                   │
│  • AI auto-slice (Claude Vision)  │  • Google OAuth login                   │
│  • Preview & adjust boundaries    │  • Review slices & alt-text             │
│  • Compress images (Squoosh)      │  • Assign links to slices               │
│  • Save sliced design             │  • Push to Template OR Campaign         │
│                                   │  • Preview in Klaviyo                   │
└───────────────────────────────────┴─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RAILWAY BACKEND                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Claude Vision API integration                                            │
│  • Squoosh CLI image compression                                            │
│  • Google OAuth verification                                                │
│  • Klaviyo API proxy (upload, template, campaign)                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Team Workflows

### Designer Workflow

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ Select  │───▶│ Analyze  │───▶│ Preview  │───▶│ Compress │───▶│  Save   │
│  Frame  │    │ (Claude) │    │ & Adjust │    │(Squoosh) │    │ Design  │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └─────────┘
```

1. **Select Frame**: Designer selects the email design frame in Figma
2. **Analyze**: Plugin sends frame to Claude Vision for intelligent slicing
3. **Preview & Adjust**: Interactive preview with draggable slice boundaries
4. **Compress**: Images compressed via Squoosh for optimal email performance
5. **Save**: Sliced design saved to Figma

### Tech Team Workflow

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│  Login  │───▶│  Load    │───▶│  Review  │───▶│ Configure│───▶│  Push   │
│ (Google)│    │  Design  │    │ & Edit   │    │ Klaviyo  │    │  Live   │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └─────────┘
```

1. **Login**: Authenticate via Google OAuth (whitelisted RFB emails only)
2. **Load Design**: Open Figma file containing sliced design
3. **Review & Edit**: Verify slices, edit alt-text, assign links
4. **Configure Klaviyo**: Choose Template or Campaign; set campaign details if applicable
5. **Push Live**: Upload to Klaviyo CDN and create template/campaign

---

## Technical Specifications

### Tech Stack

| Component | Technology |
|-----------|------------|
| Figma Plugin | TypeScript, Figma Plugin API |
| Plugin UI | Preact + CSS |
| AI Slicing | Claude Vision API (claude-sonnet-4-20250514) |
| Image Compression | Squoosh CLI (@squoosh/cli) |
| Backend | Python Flask (Railway) |
| Authentication | Google OAuth 2.0 |
| Email Platform | Klaviyo API v3 |
| Image Hosting | Klaviyo CDN |

---

## Klaviyo Image Optimization Specifications

### Hard Limits (Enforced by Plugin)

| Parameter | Klaviyo Limit | Plugin Target | Rationale |
|-----------|---------------|---------------|-----------|
| **Max file size** | 5MB per image | **≤200KB per slice** | Fast mobile loading |
| **Recommended size** | ≤1MB | **≤100KB ideal** | Optimal user experience |
| **Resolution** | 72dpi web standard | **72dpi** | No benefit to higher in email |
| **Total email HTML** | 102KB (Gmail clips) | **<80KB HTML** | Prevents clipping |

### Why These Targets Matter

```
┌─────────────────────────────────────────────────────────────────────┐
│  EMAIL PERFORMANCE IMPACT                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Image Size        Load Time (3G)     User Experience               │
│  ─────────────────────────────────────────────────────────────────  │
│  50KB              ~0.5s              ⚡ Instant                     │
│  100KB             ~1s                ✓ Good                        │
│  200KB             ~2s                ⚠ Acceptable                  │
│  500KB             ~5s                ✗ Users scroll past           │
│  1MB+              ~10s+              ✗ Users close email           │
│                                                                     │
│  Gmail Clipping (>102KB HTML):                                      │
│  • "View entire message" link appears                               │
│  • Tracking pixel may be cut off → inaccurate open rates            │
│  • Footer/unsubscribe hidden → spam complaints                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Supported Image Formats

| Format | Use Case | Plugin Behavior |
|--------|----------|-----------------|
| **JPEG** | Photos, gradients, complex images | Default for photographic content |
| **PNG** | Graphics, flat colors, transparency | Default for illustrations/icons |
| **GIF** | Animations only | Pass-through (no compression) |
| **WebP** | Not recommended | Convert to PNG before upload |

### Automatic Optimization Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Figma      │     │   Analyze    │     │   Squoosh    │     │   Validate   │
│   Export     │────▶│   Content    │────▶│   Compress   │────▶│   & Upload   │
│   (2x PNG)   │     │   Type       │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
   1200x800px          Photo? → JPEG        Quality: 82%         ≤200KB? ✓
   (2x retina)         Graphic? → PNG       Strip metadata       Upload to
                       Few colors? → PNG-8                       Klaviyo CDN
```

### Compression Settings by Content Type

#### Photos & Complex Images (MozJPEG)

```javascript
{
  "format": "mozjpeg",
  "quality": 82,           // Balance quality/size
  "progressive": true,     // Faster perceived load
  "optimize_coding": true  // Better compression
}
```

#### Graphics & Flat Colors (OxiPNG)

```javascript
{
  "format": "oxipng",
  "level": 2,              // Compression level (0-6)
  "interlace": false       // Smaller file size
}
```

#### Small Graphics with Few Colors (PNG-8/Quantized)

```javascript
{
  "format": "png",
  "colors": 256,           // Reduce color palette
  "dithering": 0.5         // Smooth gradients
}
```

### Slice Size Validation

The plugin enforces these checks before upload:

```typescript
interface SliceValidation {
  maxFileSize: 200 * 1024;      // 200KB hard limit
  warnFileSize: 100 * 1024;     // 100KB warning threshold
  minHeight: 50;                 // Prevent micro-slices
  totalEmailTarget: 500 * 1024;  // 500KB total recommended
}

function validateSlice(slice: CompressedSlice): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (slice.size > 200 * 1024) {
    errors.push(`Slice "${slice.name}" exceeds 200KB (${formatSize(slice.size)})`);
  } else if (slice.size > 100 * 1024) {
    warnings.push(`Slice "${slice.name}" is ${formatSize(slice.size)} - consider optimizing`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

### Validation UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Compression Results                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Slice         Original    Compressed   Status           │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ header        125 KB      42 KB        ✓ Optimal        │    │
│  │ hero          380 KB      89 KB        ✓ Good           │    │
│  │ product_grid  520 KB      185 KB       ⚠ Large          │    │
│  │ cta           85 KB       28 KB        ✓ Optimal        │    │
│  │ footer        62 KB       21 KB        ✓ Optimal        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Total: 1.17 MB → 365 KB (69% reduction)                        │
│                                                                 │
│  ⚠ Warning: "product_grid" is 185KB                             │
│     Consider splitting into smaller slices                      │
│                                                                 │
│  [Adjust Slices]  [Re-compress]  [Continue Anyway →]            │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Optimization Strategies

When a slice exceeds targets, the plugin offers automatic fixes:

| Issue | Auto-Fix Strategy |
|-------|-------------------|
| Slice >200KB | Increase compression (quality 75→65) |
| Slice >200KB after recompress | Suggest splitting slice |
| Total >500KB | Warn user, suggest quality reduction |
| Many similar colors | Auto-switch to PNG-8 |

### Retina Display Handling

```
Design in Figma     Export          Compress        Display in Email
─────────────────────────────────────────────────────────────────────
600px width    →   1200px (2x)  →   optimized    →  600px @ 2x density
                   for retina       file size        (crisp on retina)
```

The plugin:
1. Exports at 2x scale from Figma (1200px for 600px email) for retina quality
2. Compresses to meet size targets (≤200KB hard limit, ≤100KB ideal)
3. Email displays at 600px with retina-quality sharpness

### Gmail Clipping Prevention

The plugin monitors total email HTML size:

```
┌─────────────────────────────────────────────────────────────────┐
│  Email Size Check                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HTML Content:        12 KB                                     │
│  Inline Styles:       3 KB                                      │
│  Image References:    2 KB    (URLs only, not image data)       │
│  ─────────────────────────────                                  │
│  Total HTML Size:     17 KB   ✓ Safe (under 102KB)              │
│                                                                 │
│  Note: Images load separately from Klaviyo CDN                  │
│        and don't count toward Gmail's 102KB limit               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
figma-klaviyo-plugin/
├── plugin/
│   ├── manifest.json           # Figma plugin configuration
│   ├── src/
│   │   ├── code.ts             # Main plugin logic (Figma sandbox)
│   │   ├── ui.tsx              # Plugin UI (Preact)
│   │   ├── components/
│   │   │   ├── DesignerMode.tsx
│   │   │   ├── TechMode.tsx
│   │   │   ├── SlicePreview.tsx
│   │   │   ├── SliceAdjuster.tsx
│   │   │   └── KlaviyoConfig.tsx
│   │   ├── utils/
│   │   │   ├── figma-api.ts    # Figma node operations
│   │   │   ├── export.ts       # Frame export utilities
│   │   │   └── metadata.ts     # Plugin data storage
│   │   └── types/
│   │       └── index.ts        # TypeScript definitions
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── app.py                  # Flask application entry
│   ├── routes/
│   │   ├── analyze.py          # Claude Vision endpoint
│   │   ├── compress.py         # Squoosh processing
│   │   ├── auth.py             # Google OAuth
│   │   └── klaviyo.py          # Klaviyo API proxy
│   ├── services/
│   │   ├── claude_vision.py    # Claude API wrapper
│   │   ├── squoosh.py          # Squoosh CLI wrapper
│   │   └── klaviyo_client.py   # Klaviyo API client
│   ├── utils/
│   │   ├── auth.py             # OAuth utilities
│   │   └── storage.py          # Temporary file handling
│   ├── requirements.txt
│   └── Dockerfile
│
├── docs/
│   ├── DESIGNER_GUIDE.md       # Guide for design team
│   ├── TECH_GUIDE.md           # Guide for tech team
│   └── API.md                  # Backend API documentation
│
└── README.md
```

---

## Phase 1: Plugin Foundation

### Duration: Week 1

### Objectives
- Set up Figma plugin development environment
- Create dual-mode UI structure
- Implement frame selection and export

### Deliverables

#### 1.1 Plugin Manifest

```json
{
  "name": "Figma to Klaviyo",
  "id": "rfb-figma-klaviyo",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": [
      "https://api.anthropic.com",
      "https://your-railway-app.up.railway.app",
      "https://a.]klaviyo.com"
    ]
  }
}
```

#### 1.2 Dual-Mode UI

```
┌────────────────────────────────────────┐
│  Figma → Klaviyo              v1.0.0   │
├────────────────────────────────────────┤
│                                        │
│   ┌────────────┐  ┌────────────────┐   │
│   │  Designer  │  │   Tech  🔒     │   │
│   │    Mode    │  │    Mode        │   │
│   └────────────┘  └────────────────┘   │
│                                        │
├────────────────────────────────────────┤
│                                        │
│   (Mode-specific content loads here)   │
│                                        │
└────────────────────────────────────────┘
```

#### 1.3 Frame Selection Logic

```typescript
// code.ts
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 1 && selection[0].type === 'FRAME') {
    const frame = selection[0] as FrameNode;
    
    // Validate email dimensions (typical: 600px wide)
    if (frame.width >= 500 && frame.width <= 700) {
      figma.ui.postMessage({
        type: 'FRAME_SELECTED',
        data: {
          id: frame.id,
          name: frame.name,
          width: frame.width,
          height: frame.height
        }
      });
    }
  }
});
```

#### 1.4 Frame Export Utility

```typescript
// utils/export.ts
export async function exportFrameAsPng(
  frameId: string,
  scale: number = 2
): Promise<Uint8Array> {
  const frame = figma.getNodeById(frameId) as FrameNode;
  
  const exportSettings: ExportSettingsImage = {
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale }
  };
  
  return await frame.exportAsync(exportSettings);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

### Tasks

- [ ] Initialize Figma plugin project with TypeScript
- [ ] Set up Preact for UI components
- [ ] Create manifest.json with required permissions
- [ ] Build mode switcher component
- [ ] Implement frame selection listener
- [ ] Create PNG export utility
- [ ] Add base64 encoding for API transmission
- [ ] Set up development build pipeline (esbuild/webpack)

---

## Phase 2: AI-Powered Slicing (Designer Mode)

### Duration: Week 2

### Objectives
- Integrate Claude Vision API for intelligent slicing
- Build interactive slice preview with adjustment controls
- Store slice data in Figma node metadata

### Deliverables

#### 2.1 Claude Vision Integration

**API Endpoint**: `POST /api/analyze`

**Request**:
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "frame_width": 600,
  "frame_height": 1200
}
```

**Claude Vision Prompt**:
```
You are an expert email design analyzer. Analyze this email design image and identify optimal horizontal slice boundaries for email rendering.

Rules:
1. Each slice must span the FULL WIDTH of the email (no vertical splits)
2. Identify logical sections: header, hero, product sections, CTAs, footer, etc.
3. Place boundaries at natural visual breaks (color changes, section dividers, spacing)
4. Avoid cutting through text, images, or interactive elements
5. Each slice should be a self-contained visual unit
6. Consider mobile rendering - smaller slices load faster

Image dimensions: {width}px × {height}px

Return ONLY valid JSON in this exact format:
{
  "slices": [
    {
      "name": "section_name",
      "y_start": 0,
      "y_end": 150,
      "alt_text": "Brief description for accessibility (5-10 words)"
    }
  ],
  "analysis": "Brief explanation of slicing decisions"
}

Ensure y_end of each slice equals y_start of the next slice (no gaps or overlaps).
```

**Response**:
```json
{
  "slices": [
    {
      "name": "header",
      "y_start": 0,
      "y_end": 120,
      "alt_text": "Brand logo with summer collection banner"
    },
    {
      "name": "hero",
      "y_start": 120,
      "y_end": 480,
      "alt_text": "Summer sale 40% off with beach imagery"
    },
    {
      "name": "product_grid",
      "y_start": 480,
      "y_end": 850,
      "alt_text": "Featured products with prices"
    },
    {
      "name": "cta",
      "y_start": 850,
      "y_end": 980,
      "alt_text": "Shop now button with urgency message"
    },
    {
      "name": "footer",
      "y_start": 980,
      "y_end": 1100,
      "alt_text": "Social links and unsubscribe option"
    }
  ],
  "analysis": "Split at major color/section transitions. Hero kept intact for visual impact. Product grid as single unit for consistent loading."
}
```

#### 2.2 Backend Service

```python
# services/claude_vision.py
import anthropic
import json

class ClaudeVisionService:
    def __init__(self):
        self.client = anthropic.Anthropic()
    
    def analyze_email_design(
        self,
        image_base64: str,
        width: int,
        height: int
    ) -> dict:
        prompt = f"""You are an expert email design analyzer..."""  # Full prompt above
        
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt.format(width=width, height=height)
                        }
                    ]
                }
            ]
        )
        
        # Parse JSON from response
        response_text = message.content[0].text
        return json.loads(response_text)
```

#### 2.3 Interactive Slice Preview

```
┌─────────────────────────────────────────┐
│  Slice Preview                          │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ header                        ≡   │◄─┼── Draggable handle
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  ├───────────────────────────────────┤  │
│  │ hero                          ≡   │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  ├───────────────────────────────────┤  │
│  │ product_grid                  ≡   │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  ├───────────────────────────────────┤  │
│  │ cta                           ≡   │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  ├───────────────────────────────────┤  │
│  │ footer                        ≡   │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Slices: 5  │  Est. Size: ~450KB        │
├─────────────────────────────────────────┤
│  [+ Add Slice]  [↻ Re-analyze]  [Reset] │
└─────────────────────────────────────────┘
```

#### 2.4 Slice Adjustment Controls

| Action | Interaction | Result |
|--------|-------------|--------|
| Move boundary | Drag handle up/down | Adjusts y_end of above slice, y_start of below slice |
| Add slice | Click "+ Add Slice", click on preview | Splits slice at click point |
| Merge slices | Select two adjacent slices, click "Merge" | Combines into single slice |
| Rename slice | Double-click slice name | Inline edit (updates alt_text) |
| Delete slice | Right-click → Delete | Merges with slice above |

#### 2.5 Slice Data Storage (Figma Metadata)

```typescript
// utils/metadata.ts
interface SliceData {
  version: string;
  created_by: string;
  created_at: string;
  frame_id: string;
  frame_name: string;
  slices: Slice[];
  status: 'draft' | 'ready' | 'pushed';
}

interface Slice {
  id: string;
  name: string;
  y_start: number;
  y_end: number;
  alt_text: string;
  compressed_url?: string;
  link?: string;
}

export function saveSliceData(frameId: string, data: SliceData): void {
  const frame = figma.getNodeById(frameId) as FrameNode;
  frame.setPluginData('klaviyo_slices', JSON.stringify(data));
}

export function loadSliceData(frameId: string): SliceData | null {
  const frame = figma.getNodeById(frameId) as FrameNode;
  const data = frame.getPluginData('klaviyo_slices');
  return data ? JSON.parse(data) : null;
}
```

### Tasks

- [ ] Create `/api/analyze` endpoint on backend
- [ ] Implement Claude Vision service with structured prompt
- [ ] Build slice preview component with image overlay
- [ ] Implement draggable boundary handles
- [ ] Add slice split/merge functionality
- [ ] Create inline slice name editor
- [ ] Build Figma metadata save/load utilities
- [ ] Add loading states and error handling
- [ ] Test with various email design layouts

---

## Phase 3: Image Compression

### Duration: Week 3

### Objectives
- Integrate Squoosh CLI for image compression
- Export individual slices as optimized images
- Upload compressed images to temporary storage

### Deliverables

#### 3.1 Squoosh Integration

**Installation on Railway**:
```dockerfile
# Dockerfile
FROM node:18-slim

# Install Python and dependencies
RUN apt-get update && apt-get install -y python3 python3-pip

# Install Squoosh CLI globally
RUN npm install -g @squoosh/cli

# ... rest of Flask setup
```

**Squoosh Service (Klaviyo-Optimized)**:
```python
# services/squoosh.py
import subprocess
import os
import tempfile
from pathlib import Path
from PIL import Image
from typing import Tuple, Optional
from dataclasses import dataclass

@dataclass
class CompressionResult:
    data: bytes
    format: str
    original_size: int
    compressed_size: int
    width: int
    height: int
    passed_validation: bool
    warnings: list

# Klaviyo optimization targets
KLAVIYO_LIMITS = {
    'max_file_size': 200 * 1024,      # 200KB hard limit per slice
    'target_file_size': 100 * 1024,    # 100KB ideal target
    'warn_file_size': 150 * 1024,      # 150KB warning threshold
    'total_email_target': 500 * 1024,   # 500KB total for all slices
}

class SquooshService:
    def __init__(self):
        self.output_dir = tempfile.mkdtemp()
    
    def compress_image(
        self,
        image_bytes: bytes,
        filename: str,
        target_size: int = 100 * 1024,  # Target 100KB
        max_size: int = 200 * 1024       # Hard limit 200KB
    ) -> CompressionResult:
        """
        Compress image using Squoosh CLI with Klaviyo optimization.
        Implements progressive compression to meet size targets.
        """
        input_path = os.path.join(self.output_dir, f"input_{filename}")
        original_size = len(image_bytes)
        
        # Write input file
        with open(input_path, 'wb') as f:
            f.write(image_bytes)
        
        # Detect optimal format and initial quality
        format_type, initial_quality = self._analyze_image(input_path)
        
        # Progressive compression: try to hit target, enforce max
        quality = initial_quality
        compressed_data = None
        final_size = original_size
        
        for attempt in range(4):  # Max 4 compression attempts
            compressed_data, final_size = self._run_squoosh(
                input_path, format_type, quality
            )
            
            if final_size <= target_size:
                break  # Hit target, we're done
            elif final_size <= max_size and attempt >= 2:
                break  # Acceptable after 2 attempts
            else:
                # Reduce quality for next attempt
                quality = max(50, quality - 10)
        
        # Final validation
        warnings = []
        passed = final_size <= max_size
        
        if final_size > KLAVIYO_LIMITS['warn_file_size']:
            warnings.append(f"Large file ({final_size // 1024}KB) - may load slowly on mobile")

        # Get final dimensions
        width, height = self._get_dimensions(compressed_data)

        return CompressionResult(
            data=compressed_data,
            format=format_type,
            original_size=original_size,
            compressed_size=final_size,
            width=width,
            height=height,
            passed_validation=passed,
            warnings=warnings
        )
    
    def _analyze_image(self, image_path: str) -> Tuple[str, int]:
        """
        Analyze image to determine optimal format and starting quality.
        
        Returns:
            (format_type, initial_quality)
        """
        img = Image.open(image_path)
        
        # Count unique colors (sample for large images)
        if img.width * img.height > 500000:
            img_sample = img.resize((500, 500))
            colors = img_sample.getcolors(maxcolors=50000)
        else:
            colors = img.getcolors(maxcolors=50000)
        
        # Detect image type
        if colors is None:
            # Too many colors to count = complex photo
            return ('mozjpeg', 82)
        
        unique_colors = len(colors)
        
        if unique_colors < 256:
            # Very few colors = graphic, use PNG-8
            return ('oxipng', 2)  # Level 2 compression
        elif unique_colors < 5000:
            # Moderate colors = illustration/graphic with gradients
            return ('oxipng', 3)
        else:
            # Many colors = photo
            return ('mozjpeg', 82)
    
    def _run_squoosh(
        self,
        input_path: str,
        format_type: str,
        quality: int
    ) -> Tuple[bytes, int]:
        """Run Squoosh CLI with specified settings."""

        output_dir = tempfile.mkdtemp()

        # Build format-specific flags
        if format_type == 'mozjpeg':
            format_flag = f'--mozjpeg \'{{"quality":{quality},"progressive":true}}\''
        else:
            format_flag = f'--oxipng \'{{"level":{quality}}}\''

        cmd = f'npx @squoosh/cli {format_flag} -d {output_dir} {input_path}'
        
        subprocess.run(cmd, shell=True, check=True, capture_output=True)
        
        # Find output file
        output_files = list(Path(output_dir).glob('*'))
        if not output_files:
            raise Exception("Squoosh compression failed")
        
        with open(output_files[0], 'rb') as f:
            data = f.read()
        
        return data, len(data)
    
    def _get_dimensions(self, image_data: bytes) -> Tuple[int, int]:
        """Get width and height from compressed image."""
        from io import BytesIO
        img = Image.open(BytesIO(image_data))
        return img.width, img.height
    
    def validate_total_size(self, slices: list) -> dict:
        """
        Validate total email size against Klaviyo recommendations.
        """
        total_size = sum(s['compressed_size'] for s in slices)
        
        return {
            'total_size': total_size,
            'total_size_kb': total_size // 1024,
            'target': KLAVIYO_LIMITS['total_email_target'],
            'passed': total_size <= KLAVIYO_LIMITS['total_email_target'],
            'message': (
                f"Total: {total_size // 1024}KB - "
                f"{'✓ Good' if total_size <= KLAVIYO_LIMITS['total_email_target'] else '⚠ Consider optimizing'}"
            )
        }
```

#### 3.2 Slice Export Endpoint

**API Endpoint**: `POST /api/compress`

**Request**:
```json
{
  "slices": [
    {
      "id": "slice_001",
      "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "name": "header"
    },
    {
      "id": "slice_002",
      "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "name": "hero"
    }
  ],
  "settings": {
    "target_size_kb": 100,
    "max_size_kb": 200
  }
}
```

**Response**:
```json
{
  "compressed": [
    {
      "id": "slice_001",
      "name": "header",
      "original_size": 125000,
      "compressed_size": 42000,
      "reduction_percent": 66,
      "width": 600,
      "height": 120,
      "format": "mozjpeg",
      "status": "optimal",
      "warnings": [],
      "temp_url": "https://backend.railway.app/temp/abc123.jpg"
    },
    {
      "id": "slice_002",
      "name": "hero",
      "original_size": 380000,
      "compressed_size": 89000,
      "reduction_percent": 77,
      "width": 600,
      "height": 360,
      "format": "mozjpeg",
      "status": "good",
      "warnings": [],
      "temp_url": "https://backend.railway.app/temp/def456.jpg"
    },
    {
      "id": "slice_003",
      "name": "product_grid",
      "original_size": 520000,
      "compressed_size": 185000,
      "reduction_percent": 64,
      "width": 600,
      "height": 720,
      "format": "mozjpeg",
      "status": "warning",
      "warnings": [
        "Large file (185KB) - may load slowly on mobile"
      ],
      "temp_url": "https://backend.railway.app/temp/ghi789.jpg"
    }
  ],
  "summary": {
    "total_original": 1025000,
    "total_compressed": 316000,
    "total_reduction_percent": 69,
    "slice_count": 3,
    "passed_count": 3,
    "warning_count": 1,
    "failed_count": 0
  },
  "validation": {
    "total_size_kb": 316,
    "target_kb": 500,
    "status": "passed",
    "message": "Total: 316KB - ✓ Good for email delivery"
  },
  "recommendations": [
    {
      "slice": "product_grid",
      "issue": "185KB exceeds 100KB target",
      "suggestion": "Consider splitting into 2 slices at product row boundary"
    }
  ]
}
```

#### 3.3 Figma Slice Export

```typescript
// utils/export.ts
export async function exportSlices(
  frameId: string,
  slices: Slice[]
): Promise<SliceExport[]> {
  const frame = figma.getNodeById(frameId) as FrameNode;
  const exports: SliceExport[] = [];
  
  for (const slice of slices) {
    // Create a temporary slice of the frame
    const sliceHeight = slice.y_end - slice.y_start;
    
    // Clone the frame and crop to slice bounds
    const clone = frame.clone();
    
    // Use export with constraints
    const exportSettings: ExportSettingsImage = {
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }  // 2x for retina
    };
    
    // Export the slice region
    // Note: Figma doesn't support direct region export,
    // so we use a workaround with a temporary frame
    const sliceFrame = figma.createFrame();
    sliceFrame.resize(frame.width, sliceHeight);
    sliceFrame.y = slice.y_start;
    
    // ... (implementation details for clipping)
    
    const bytes = await sliceFrame.exportAsync(exportSettings);
    
    exports.push({
      id: slice.id,
      name: slice.name,
      image_base64: uint8ArrayToBase64(bytes),
      width: frame.width,
      height: sliceHeight
    });
    
    // Cleanup
    sliceFrame.remove();
    clone.remove();
  }
  
  return exports;
}
```

#### 3.4 Compression UI (Klaviyo-Optimized)

```
┌───────────────────────────────────────────────────────────────────┐
│  Compress & Save                                                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Klaviyo Optimization Targets                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Per slice: ≤100KB ideal │ ≤200KB max                        │  │
│  │ Total email: ≤500KB recommended                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Slice         Original   Final    Status                    │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ header        125 KB     42 KB    ✓ Optimal                 │  │
│  │ hero          380 KB     89 KB    ✓ Good                    │  │
│  │ product_grid  520 KB     185 KB   ⚠ Large                   │  │
│  │ cta           85 KB      28 KB    ✓ Optimal                 │  │
│  │ footer        62 KB      21 KB    ✓ Optimal                 │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ TOTAL         1.17 MB    365 KB            ✓ Under 500KB    │  │
│  │ Reduction     ██████████████░░░ 69%                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ ⚠ Recommendation                                            │  │
│  │ "product_grid" is 185KB (target: ≤100KB)                    │  │
│  │ → Consider splitting at product row boundary                 │  │
│  │                                                              │  │
│  │ [Split This Slice]  [Ignore]                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  [← Adjust Slices]  [Re-compress]  [Save →]                       │
└───────────────────────────────────────────────────────────────────┘
```

**Status Indicators**:

| Status | Criteria | Color |
|--------|----------|-------|
| ✓ Optimal | ≤100KB | Green |
| ✓ Good | 100-150KB | Light Green |
| ⚠ Large | 150-200KB | Yellow |
| ✗ Failed | >200KB | Red (blocks save) |

### Tasks

- [ ] Set up Squoosh CLI on Railway backend
- [ ] Create compress endpoint with batch processing
- [ ] Implement intelligent format detection (JPEG vs PNG)
- [ ] Build Figma slice export utility
- [ ] Create compression settings UI
- [ ] Add progress indicator for compression
- [ ] Implement temporary URL storage for compressed images
- [ ] Test compression with various image types
- [ ] Add compression quality presets (email-optimized, high-quality)

---

## Phase 4: Authentication & Klaviyo Integration (Tech Mode)

### Duration: Week 4

### Objectives
- Implement Google OAuth for tech team authentication
- Build Klaviyo API integration for image upload and template/campaign creation

### Deliverables

#### 4.1 Google OAuth Flow

**Why Google OAuth?**

Klaviyo uses private API keys, not OAuth. We use Google OAuth to:
1. Verify tech team member identity
2. Map authenticated users to stored Klaviyo credentials
3. Maintain security without exposing API keys in the plugin

**OAuth Architecture**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Figma     │     │   Backend   │     │   Google    │
│   Plugin    │     │  (Railway)  │     │   OAuth     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Click Login   │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │  2. Auth URL      │                   │
       │◀──────────────────│                   │
       │                   │                   │
       │  3. Open browser popup                │
       │──────────────────────────────────────▶│
       │                   │                   │
       │                   │  4. User consents │
       │                   │◀──────────────────│
       │                   │                   │
       │                   │  5. Auth code     │
       │                   │◀──────────────────│
       │                   │                   │
       │  6. Session token │                   │
       │◀──────────────────│                   │
       │                   │                   │
```

**Backend OAuth Implementation**:

```python
# routes/auth.py
from flask import Blueprint, request, redirect, session
from google.oauth2 import id_token
from google.auth.transport import requests
import os

auth_bp = Blueprint('auth', __name__)

# Whitelist of allowed email domains
ALLOWED_DOMAINS = ['retentionforbrands.com', 'rfb.com']

# User -> Klaviyo API key mapping (stored securely)
# In production, this would be in a database
USER_KLAVIYO_KEYS = {
    'jai@retentionforbrands.com': os.environ.get('KLAVIYO_KEY_JAI'),
    'dean@retentionforbrands.com': os.environ.get('KLAVIYO_KEY_DEAN'),
    # ... other team members
}

@auth_bp.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Verify Google OAuth token and create session."""
    token = request.json.get('credential')
    
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            os.environ.get('GOOGLE_CLIENT_ID')
        )
        
        email = idinfo['email']
        domain = email.split('@')[1]
        
        # Check if user is allowed
        if domain not in ALLOWED_DOMAINS:
            return {'error': 'Unauthorized domain'}, 403
        
        # Check if user has Klaviyo access
        if email not in USER_KLAVIYO_KEYS:
            return {'error': 'No Klaviyo access configured'}, 403
        
        # Create session token
        session_token = create_session_token(email)
        
        return {
            'success': True,
            'user': {
                'email': email,
                'name': idinfo.get('name'),
                'picture': idinfo.get('picture')
            },
            'session_token': session_token
        }
        
    except ValueError:
        return {'error': 'Invalid token'}, 401


def get_klaviyo_key_for_user(email: str) -> str:
    """Get Klaviyo API key for authenticated user."""
    return USER_KLAVIYO_KEYS.get(email)
```

#### 4.2 Klaviyo API Integration

**Klaviyo Client Service**:

```python
# services/klaviyo_client.py
import requests
from typing import List, Optional

class KlaviyoClient:
    BASE_URL = "https://a.klaviyo.com/api"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Klaviyo-API-Key {api_key}",
            "accept": "application/json",
            "content-type": "application/json",
            "revision": "2024-02-15"
        }
    
    def upload_image(self, image_bytes: bytes, filename: str) -> str:
        """
        Upload image to Klaviyo CDN.
        Returns the hosted image URL.
        """
        url = f"{self.BASE_URL}/images/"
        
        files = {
            'file': (filename, image_bytes, 'image/jpeg')
        }
        
        # Note: File upload uses different headers
        upload_headers = {
            "Authorization": f"Klaviyo-API-Key {self.api_key}",
            "accept": "application/json",
            "revision": "2024-02-15"
        }
        
        response = requests.post(url, headers=upload_headers, files=files)
        response.raise_for_status()
        
        data = response.json()
        return data['data']['attributes']['image_url']
    
    def create_template(
        self,
        name: str,
        html_content: str
    ) -> dict:
        """Create a new email template."""
        url = f"{self.BASE_URL}/templates/"
        
        payload = {
            "data": {
                "type": "template",
                "attributes": {
                    "name": name,
                    "html": html_content,
                    "editor_type": "CODE"
                }
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        
        return response.json()
    
    def create_campaign(
        self,
        name: str,
        subject: str,
        preview_text: str,
        list_id: str,
        template_id: str,
        send_time: Optional[str] = None
    ) -> dict:
        """Create a new email campaign."""
        url = f"{self.BASE_URL}/campaigns/"
        
        payload = {
            "data": {
                "type": "campaign",
                "attributes": {
                    "name": name,
                    "audiences": {
                        "included": [list_id]
                    },
                    "send_strategy": {
                        "method": "immediate" if not send_time else "static",
                        "options_static": {
                            "datetime": send_time
                        } if send_time else None
                    },
                    "campaign-messages": {
                        "data": [{
                            "type": "campaign-message",
                            "attributes": {
                                "channel": "email",
                                "label": "Email",
                                "content": {
                                    "subject": subject,
                                    "preview_text": preview_text
                                },
                                "template_id": template_id
                            }
                        }]
                    }
                }
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        
        return response.json()
    
    def get_lists(self) -> List[dict]:
        """Fetch all available lists."""
        url = f"{self.BASE_URL}/lists/"
        
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        
        data = response.json()
        return [
            {
                'id': item['id'],
                'name': item['attributes']['name'],
                'member_count': item['attributes'].get('profile_count', 0)
            }
            for item in data['data']
        ]
```

#### 4.3 HTML Template Generation

```python
# services/template_builder.py

def build_email_html(slices: List[dict]) -> str:
    """
    Generate Klaviyo-compatible HTML from slices.
    Each slice becomes a full-width image block.
    """
    
    slice_html = ""
    
    for slice in slices:
        link = slice.get('link', '#')
        alt_text = slice.get('alt_text', slice['name'])
        image_url = slice['klaviyo_url']
        
        slice_html += f"""
        <tr>
          <td align="center" style="padding: 0;">
            <a href="{link}" target="_blank" style="display: block;">
              <img 
                src="{image_url}" 
                alt="{alt_text}"
                width="600"
                style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;"
              />
            </a>
          </td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
              {slice_html}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
    
    return html
```

#### 4.4 Tech Mode UI

```
┌─────────────────────────────────────────────┐
│  Tech Mode                                  │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │ 👤 jai@retentionforbrands.com      │    │
│  │    [Logout]                         │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  Selected Design                            │
│  ┌─────────────────────────────────────┐    │
│  │ 📧 Summer_Sale_Hero_v3              │    │
│  │    5 slices • 286 KB total          │    │
│  │    Created by: adam@rfb.com         │    │
│  │    Mar 10, 2026 2:30 PM             │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  Push Destination                           │
│                                             │
│  ○ Template (reusable)                      │
│  ● Campaign (one-time send)                 │
│                                             │
├─────────────────────────────────────────────┤
│  Campaign Settings                          │
│  ┌─────────────────────────────────────┐    │
│  │ List: [Newsletter Subs (45,230) ▼]  │    │
│  │ Subject: [Summer Sale - 40% Off!  ] │    │
│  │ Preview: [Don't miss out on our...] │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  Slice Configuration                        │
│  ┌─────────────────────────────────────────┐│
│  │ # │ Name    │ Alt Text      │ Link     ││
│  ├───┼─────────┼───────────────┼──────────┤│
│  │ 1 │ header  │ Brand logo    │ [/home]  ││
│  │ 2 │ hero    │ 40% off sale  │ [/sale]  ││
│  │ 3 │ grid    │ Products      │ [/shop]  ││
│  │ 4 │ cta     │ Shop now      │ [/sale]  ││
│  │ 5 │ footer  │ Unsubscribe   │ [{unsub}]││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  [Preview HTML]  [Push to Klaviyo →]        │
└─────────────────────────────────────────────┘
```

### Tasks

- [ ] Set up Google OAuth credentials and consent screen
- [ ] Create OAuth flow endpoints on backend
- [ ] Build user whitelist and Klaviyo key mapping system
- [ ] Implement Klaviyo API client (upload, template, campaign, lists)
- [ ] Create HTML email template builder
- [ ] Build Tech Mode login UI
- [ ] Build slice configuration table with editable fields
- [ ] Add campaign settings form
- [ ] Implement push flow (upload images → create template → create campaign)
- [ ] Add preview functionality (render HTML in modal)
- [ ] Handle Klaviyo API errors gracefully

---

## Phase 5: Testing & Polish

### Duration: Week 5

### Objectives
- End-to-end testing with real email designs
- Error handling and edge cases
- Documentation and team training

### Deliverables

#### 5.1 Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Select non-email frame (wrong dimensions) | Show warning, suggest correct frame |
| Claude Vision fails to parse | Fall back to manual slicing mode |
| Large image (>5MB) | Show warning, suggest reducing quality |
| Compression fails | Retry with different settings, show error |
| OAuth token expired | Prompt re-authentication |
| Klaviyo upload fails | Show specific error, allow retry |
| No sliced data in frame | Tech Mode shows "Design not ready" |

#### 5.2 Error Handling

```typescript
// Graceful error handling throughout
try {
  const result = await analyzeDesign(frameId);
  // ... handle success
} catch (error) {
  if (error.code === 'CLAUDE_RATE_LIMIT') {
    showError('AI service is busy. Please wait 30 seconds and try again.');
  } else if (error.code === 'INVALID_DIMENSIONS') {
    showError('Please select an email frame (500-700px wide).');
  } else if (error.code === 'KLAVIYO_AUTH') {
    showError('Klaviyo authentication failed. Please contact admin.');
  } else {
    showError('Something went wrong. Please try again.');
    console.error(error);
  }
}
```

#### 5.3 Documentation

- **DESIGNER_GUIDE.md**: Step-by-step guide for design team
- **TECH_GUIDE.md**: Step-by-step guide for tech team
- **API.md**: Backend API documentation
- **TROUBLESHOOTING.md**: Common issues and solutions

### Tasks

- [ ] Create comprehensive test suite
- [ ] Test with 10+ real email designs
- [ ] Add error boundary components
- [ ] Implement retry logic for API calls
- [ ] Write user documentation
- [ ] Create video walkthrough for each team
- [ ] Internal beta test with RFB team
- [ ] Gather feedback and iterate

---

## API Reference

### Backend Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analyze` | POST | None | Claude Vision slicing analysis |
| `/api/compress` | POST | None | Squoosh image compression |
| `/api/auth/google` | POST | None | Google OAuth verification |
| `/api/auth/verify` | GET | Session | Verify session token |
| `/api/klaviyo/upload` | POST | Session | Upload images to Klaviyo |
| `/api/klaviyo/template` | POST | Session | Create Klaviyo template |
| `/api/klaviyo/campaign` | POST | Session | Create Klaviyo campaign |
| `/api/klaviyo/lists` | GET | Session | Fetch available lists |

---

## Environment Variables

### Backend (Railway)

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Klaviyo API Keys (per user)
KLAVIYO_KEY_JAI=pk_...
KLAVIYO_KEY_DEAN=pk_...
KLAVIYO_KEY_ADAM=pk_...

# Session
SESSION_SECRET=...
```

### Plugin

```typescript
const BACKEND_URL = 'https://your-railway-app.up.railway.app';
const GOOGLE_CLIENT_ID = '...';
```

---

## Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Foundation | Plugin scaffold, dual-mode UI, frame export |
| 2 | AI Slicing | Claude Vision integration, interactive preview |
| 3 | Compression | Squoosh pipeline, slice export, temp storage |
| 4 | Klaviyo + Auth | Google OAuth, Klaviyo API |
| 5 | Polish | Testing, error handling, documentation |

---

## Success Metrics

| Metric | Target | Klaviyo Benchmark |
|--------|--------|-------------------|
| Design-to-Klaviyo time | <10 minutes | vs 45+ minutes manual |
| Image compression rate | >60% reduction | Target ≤100KB per slice |
| Total email size | ≤500KB | Klaviyo recommends ≤1MB |
| Per-slice size compliance | 100% under 200KB | Hard limit enforced |
| Slice accuracy (no adjustment) | >80% of designs | AI slicing quality |
| Tech team adoption | 100% within 2 weeks | Full workflow adoption |
| Gmail clipping prevention | 100% | HTML under 102KB |

### Klaviyo-Specific Quality Gates

| Gate | Requirement | Enforcement |
|------|-------------|-------------|
| Max slice size | ≤200KB | Blocks save if exceeded |
| Recommended slice size | ≤100KB | Warning if exceeded |
| Total email images | ≤500KB | Warning if exceeded |
| Supported formats | JPEG, PNG | Auto-converted |

---

## Future Enhancements (Post-MVP)

1. **Brand presets**: Save link patterns, footer templates per brand
2. **A/B variant generation**: Auto-create variations for testing
3. **Analytics integration**: Track email performance back in Figma
4. **Batch processing**: Process multiple designs at once
5. **Version history**: Track design iterations and changes
6. **Mobile preview**: Live preview of how email renders on mobile

---

## Support

For issues or questions:
- Plugin bugs: Create issue in this repo
- Klaviyo access: Contact Jordan
- Design questions: Contact Adam

---

*Built by RFB AI Team*
