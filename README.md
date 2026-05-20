# wo — Personal Workout Tracker

A personal workout tracker that reads `.md` files and turns them into an interactive gym session app. No server, no framework, no dependencies beyond a webfont CDN.

Live at: https://leonardo3108.github.io/wo/app.html

---

## Features

- **Opens `.md` workout files** from your device — files never leave your phone
- **Interactive exercise cards** — mark sets as done, edit load and reps inline
- **Drag-and-drop** to reorder exercises mid-session
- **Notes per exercise** — tap the note icon to add observations
- **Multiple workouts** open at once, in tabs
- **Register session** — generates a `.txt` log with all completed exercises, specs and any load changes
- **PWA** — installable on Android and iPhone, works offline after first visit

---

## Workout file format (`.md`)

```markdown
# Treino A1

Musculação - Parte superior

## Aquecimento
### Elíptico 5 min
Inicio - 0-2 min - 4 km/h - 90-100 rpm

## Puxada Aberta
[Lat Machine](https://maps.app.goo.gl/...) 8 NE
Carga 35 regulagem banco 3
3 x 10-12

## Alongamento
Panturrilha
Isquiotibial

## Pós-Treino
Elíptico 8-12 min
Recuperação - 0-2 min - 3 km/h - 60-70 rpm
```

Sections recognized by keyword: `Aquecimento`, `Alongamento`, `Pós-Treino`. Everything else becomes an exercise card.

---

## Usage

1. Open the app (browser or home screen icon)
2. Tap **Abrir treino** and select a `.md` file from your device
3. Work through the exercises, marking each one done
4. Tap **Registrar treino** to save a session log

The `.md` workout files live on your device (local storage, iCloud, Google Drive). Only the app itself is hosted here.

---

## Install as app

### Android
1. Open `https://leonardo3108.github.io/wo/app.html` in **Chrome**
2. Tap the **⋮** menu (top right) → **"Add to Home screen"**
3. Confirm the name → **Add**

### iPhone
1. Open `https://leonardo3108.github.io/wo/app.html` in **Safari** (Chrome won't work)
2. Tap the share button **⬆** (bottom center)
3. Scroll down and tap **"Add to Home Screen"**
4. Confirm the name → **Add**

Once installed, the app opens without a browser bar and works offline after the first visit.

---

## Files

| File | Description |
|------|-------------|
| `app.html` | Main app — multi-workout tab view |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker for offline caching |
| `icon.svg` | App icon |

---

## License

[GNU Affero General Public License v3.0](LICENSE) — free to use and modify, but any derivative work (including hosted services) must also be open source.
