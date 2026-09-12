<p align="center">
  <img src="banner.jpg" alt="Typing Exorcism Banner" width="100%"/>
</p>

# 🕯️ Typing Exorcism

**A browser-based horror typing game where your webcam is your enemy.**

You are an exorcist. A demon lurks in the darkness ahead. Your only weapon? A Latin incantation that must be typed perfectly — without looking at your keyboard.

The game uses your **real webcam and face tracking** to detect if you look away from the screen. Every glance down at your keyboard brings the demon closer. Look away for too long... and it's game over.

---

## 🎮 How to Play

1. **Grant camera access** — the game needs your webcam to track your face.
2. **Calibrate** — look straight at the screen while the eye tracker locks onto your face.
3. **Start typing** — the Latin incantation appears on screen. Type it character by character.
4. **Don't look away** — if the tracker detects your head tilting down, your eyes closing, or your pupils gazing toward your keyboard, **the demon advances**.
5. **Survive** — finish the incantation before the demon reaches you.

### ⌨️ Controls

| Key | Action |
|---|---|
| Any letter/symbol | Type the next character of the incantation |
| `Backspace` | Correct a mistyped character (you're locked until you fix it) |
| Your eyes 👀 | **Keep them on the screen.** |

---

## 👹 The Demon

It starts far away — a dark, spiky shape with pulsing red eyes, lurking in the fog. Every second you spend looking away, it lurches closer. You'll know it's getting near because:

- The **heartbeat** gets faster and louder
- The **screen glitches** harder — VHS static, chromatic aberration, tracking errors
- The **camera shakes**
- The **threat meter** fills with red

If it reaches you: jumpscare. Game over. You are possessed.

If you finish typing the incantation: the demon is banished. Your soul is safe... for now.

---

## 🔍 The Eye Tracking

The game tracks three signals from your face in real-time:

- **Head pitch** — are you tilting your head downward?
- **Eye gaze** — are your pupils pointing down (even if your head is still)?
- **Eye closure** — are your eyes closed?

Any of these will trigger the demon's approach. A real-time telemetry HUD shows you exactly what the tracker sees, with a face mesh overlay drawn directly on the webcam feed.

> **Pro tip:** The game auto-calibrates to your neutral face position. Sit comfortably and look straight ahead during the calibration phase.

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/manikiran949/gaze-lock-survival.git
cd gaze-lock-survival

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser (Chrome recommended for best webcam/WebGL support).

### Requirements

- A **webcam** (built-in or external)
- A modern browser with **WebGL** support
- **Chrome** is recommended (best MediaPipe + WebGL performance)

---

## 🎨 Aesthetic

The entire game is wrapped in a **cursed VHS tape** aesthetic:

- CRT screen curvature
- Scanlines and static noise
- Chromatic aberration that intensifies with danger
- Horizontal glitch/tracking errors
- Deep vignette
- Blood-red UI with monospace fonts

Everything gets worse as the demon gets closer.

---

## 📁 Project Structure

```
gaze-lock-survival/
├── index.html              # Game HTML (screens, HUD, webcam)
├── src/
│   ├── main.js             # Game loop & state machine
│   ├── FaceTracker.js       # MediaPipe face landmark tracking
│   ├── WebcamManager.js     # Camera access wrapper
│   ├── typing/
│   │   └── TypingEngine.js  # Strict typing mechanics
│   ├── audio/
│   │   └── AudioEngine.js   # Procedural heartbeat & SFX
│   ├── scene/
│   │   ├── SceneManager.js  # Three.js renderer & post-processing
│   │   └── Demon.js         # Procedural demon entity
│   ├── shaders/
│   │   └── VHSShader.js     # Custom VHS post-processing
│   ├── ui/
│   │   └── UIManager.js     # Screen transitions & HUD
│   └── styles.css           # Full VHS-styled CSS
├── package.json
└── vite.config.js
```

---

## 📜 License

MIT
