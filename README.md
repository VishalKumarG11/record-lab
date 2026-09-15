# Record-lab app (Desktop Screen Recorder)

A high-performance desktop screen recording app built with Electron, featuring aesthetic studio mockup frames, smooth dynamic auto-zoom, and multi-resolution export options.

---

## Key Features

* **Cinematic Auto-Zoom Engine:** Real-time mouse movement tracking with velocity-based stabilization to focus on active regions without camera jitter.
* **Aesthetic Studio Mockup:** Surrounds your recording with a modern window frame, rounded corners, drop shadows, and uniform margins.
* **Theme & Wallpaper Customization:** Built-in gradient palettes, dark theme, designer color picker, and custom wallpaper image upload.
* **Aspect Ratio Switcher:** Supports 16:9 (Horizontal), 9:16 (Vertical/Shorts), 1:1 (Square), and 4:3 (Classic) without distorting recorded video content.
* **Multi-Resolution Export:** Export processed zoom recordings from 240p up to 4K (2160p) in MP4/WebM formats.

---

## Tech Stack

* **Runtime:** Electron (Node.js)
* **Build System:** Electron Forge + Webpack
* **Rendering Pipeline:** HTML5 Canvas API & MediaStreams API

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/record-lab.git](https://github.com/your-username/record-lab.git)