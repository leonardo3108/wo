# wo — Personal Workout Tracker

A personal workout tracker that reads `.md` files and turns them into an interactive gym session app. Available as a **web app** (no install needed) and a **native Android app** with persistent storage and session history.

Live at: https://leonardo3108.github.io/wo/app.html

---

## Features

- **Interactive exercise cards** — mark sets as done, edit load and reps inline
- **Drag-and-drop** to reorder exercises mid-session
- **Notes per exercise** — tap the note icon to add observations
- **Multiple workouts** open at once, in tabs
- **Concluir treino** — generates a session log with all completed exercises, specs and load changes
- **PWA** — installable on Android and iPhone, works offline after first visit

### Native Android app only

- **Workouts saved in the app** — no need to open a file each session
- **Workout editor** — create, edit, and duplicate `.md` workout files directly in the app
- **Manage workouts** — list view with long-press to delete
- **Session history** — browse and share all past session logs

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

The subtitle line (`Musculação`, `Aeróbico`, `Outros`) controls the workout icon and type. Musculação accepts a part (`Parte superior`, `Parte inferior`, `Completa`).

---

## Usage

### Web app (browser)

1. Open the app (browser or home screen icon)
2. Tap **Abrir treino** and select a `.md` file from your device
3. Work through the exercises, marking each set done
4. Tap **Concluir treino** to save a session log

The `.md` workout files live on your device (local storage, iCloud, Google Drive). Only the app itself is hosted here.

### Native Android app

1. Install the APK
2. Go to **Gerir treinos** to import or create workout files
3. Tap a workout from the home screen to start a session
4. Tap **Concluir treino** — the log is saved automatically
5. Browse past sessions in **Ver registros**

---

## Build

The APK is built automatically via GitHub Actions on every push to `main`. To download:

1. Go to the **Actions** tab on GitHub
2. Open the latest **Build APK Debug** run
3. Download the `wo-debug` artifact — it contains `wo-debug.apk`

You can also trigger a build manually from the Actions tab using **Run workflow**.

---

## Install as app

### Android (native app)
Download and install the APK directly — no Play Store required.

### Android (PWA)
1. Open `https://leonardo3108.github.io/wo/app.html` in **Chrome**
2. Tap the **⋮** menu → **"Add to Home screen"**

### iPhone (PWA)
1. Open `https://leonardo3108.github.io/wo/app.html` in **Safari** (Chrome won't work)
2. Tap the share button **⬆** → **"Add to Home Screen"**

Once installed as a PWA, the app opens without a browser bar and works offline after the first visit.

---

## How To

| Feature | How |
|---|---|
| Run a session | Tap workout → mark sets → **Concluir treino** |
| Create a workout | **Gerir treinos → Novo treino** → editor |
| Edit a workout | **Gerir treinos** → tap workout → edit inline |
| Duplicate a workout | Inside editor → **Duplicar** → new title |
| Delete a workout | **Gerir treinos** → long-press → confirm |
| Review history | **Ver registros** → tap session → share |

---

## Technical Details

No server, no framework, no build step. The web app is plain HTML + vanilla JS served statically via GitHub Pages. The native Android app is built with [Capacitor](https://capacitorjs.com/), which wraps the same web source (`www/`) in a WebView and exposes native filesystem APIs.

### Stack

- **Web**: Vanilla JS, HTML, CSS — no bundler, no framework
- **Icons**: [Tabler Icons](https://tabler-icons.io/) via CDN webfont
- **Native**: Capacitor 6 + Capacitor Filesystem plugin
- **Offline**: Service worker (`sw.js`) caches all app assets on first visit
- **Storage (browser)**: `localStorage` for recent file names; `sessionStorage` for open file handles
- **Storage (native)**: External storage directory on Android, organized in `Treinos/` and `Registros/` folders

### Files

| File / Dir | Description |
|---|---|
| `www/index.html` | App entry point |
| `www/app.js` | Core: markdown parser, tab renderer |
| `www/home.js` | Home screen (browser and native flows) |
| `www/treino-arquivo.js` | File loading and workout list screen |
| `www/treino-editor.js` | In-app workout editor |
| `www/treino-execucao-render.js` | Exercise card renderer |
| `www/treino-execucao-interacoes.js` | Card interactions (drag, sets, notes) |
| `www/atividade-modal.js` | Activity detail modal |
| `www/registro.js` | Session log generation |
| `www/registro-lista.js` | Session history screen |
| `www/filesystem.js` | Capacitor Filesystem plugin (native) |
| `www/style.css` | Styles |
| `www/sw.js` | Service worker for offline caching |
| `www/manifest.json` | PWA manifest |
| `www/icon.svg` | App icon |
| `capacitor.config.json` | Capacitor / Android build config |
| `android/` | Native Android project (Capacitor) |

### Feature map

**Run a session**
1. Taps a workout on the home screen → `treino-arquivo.js/openRecent()` — reads the `.md` file from `Treinos/`
2. *(file loaded)* → `treino-execucao-render.js/render()` — parses markdown and mounts the session screen
3. *(screen built)* → `treino-execucao-render.js/buildTreinoNode()` — builds the exercise card tree from parsed sections
4. Taps a check button → `treino-execucao-interacoes.js/toggleDone()` — marks a set or stretch item as done
5. Taps load value → `treino-execucao-interacoes.js/editCarga()` — opens inline editor for load
6. Taps note icon → `treino-execucao-interacoes.js/toggleObs()` — opens/closes the notes field on a card
7. Holds and drags a card → `treino-execucao-interacoes.js/initDragAndDrop()` — reorders cards within a section
8. Holds and drags a section → `treino-execucao-interacoes.js/initSectionDragAndDrop()` — reorders sections

**Complete session**
1. Taps **Concluir treino** → `registro.js/registrar()` — triggers log generation and saves `.txt` to `Registros/`
2. *(generating log)* → `registro.js/coletarTreino()` — collects all done exercises and specs from the DOM
3. *(generating log)* → `registro.js/coletarAdicionados()` — collects exercises added mid-session

**Create a workout**
1. Taps **Novo treino** → `treino-lista.js/novoTreino()` — shows the modal to enter a title
2. Confirms title → `treino-lista.js/criarNovoTreino()` — saves an empty `.md` to `Treinos/`
3. *(file created)* → `treino-editor.js/editarTreino()` — opens the new file in the editor

**Edit a workout**
1. Taps a workout in **Gerir treinos** → `treino-editor.js/editarTreino()` — loads file and renders in edit mode
2. Taps any text to edit → `treino-editor.js/editInPlace()` — activates inline editing for titles and names
3. Navigates away / taps save → `treino-editor.js/serializarTreinoParaMarkdown()` — converts edited DOM back to `.md`
4. *(serialized)* → `treino-editor.js/salvarTreinoEditado()` — writes markdown back to `Treinos/`

**Duplicate a workout**
1. Taps **Duplicar** in editor → `treino-lista.js/duplicarTreino()` — shows modal to enter the copy's title
2. Confirms title → `treino-lista.js/confirmarDuplicacao()` — serializes editor state and saves under new name

**Delete a workout**
1. Long-presses a workout → `treino-lista.js/confirmarDelecaoTreino()` — shows the confirmation modal
2. Confirms → `treino-lista.js/deletarTreinoDoApp()` — deletes the file from `Treinos/`

**Review history**
1. Taps **Ver registros** → `registro-lista.js/verRegistros()` — lists all `.txt` files from `Registros/`
2. Taps a session → `registro-lista.js/mostrarRegistro()` — loads and displays the full log
3. Taps share → `registro-lista.js/compartilharRegistro()` — triggers the native share sheet

---

## License

[GNU Affero General Public License v3.0](LICENSE) — free to use and modify, but any derivative work (including hosted services) must also be open source.

This software is provided **as is**, without warranty of any kind. The author is not responsible for any loss of data or damage arising from its use.
