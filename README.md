# Grid Generator

**Create, customize, and export image grids in your browser.**

Grid Generator is a lightweight, browser-based tool for arranging images into a grid or collage. Customize the layout, edit individual images, organize saved boards, and export the finished result—all without a build step.

**[Open Grid Generator](https://destroboyb.github.io/Grid-Generator/)**

## Features

- **Flexible layouts** — Configure 1–10 rows and columns, choose from common image aspect ratios, and adjust spacing and background color.
- **Bring in images** — Import files individually or in bulk, drag and drop images, use image URLs, or search supported image sources.
- **Edit images** — Crop, rotate, flip, and adjust brightness, contrast, saturation, blur, and filters.
- **Organize your work** — Save grids in your browser, search your library, and organize boards with nested categories.
- **Undo and redo** — Reverse supported editing actions.
- **Export** — Save your finished board as PNG, JPG, or WebP.

## Getting started

No installation or build process is required to use the hosted app. Open the link above in a modern browser.

To run the project locally, use a local HTTP server from the repository directory. For example, with Python installed:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000). Because the app uses JavaScript modules, opening `index.html` directly as a `file://` URL is not supported.

## Saved data and external services

- **Local storage:** Saved grids and library data stay in this browser's site storage. They are not automatically synchronized between browsers or devices. Clearing the site's browser data may remove them.
- **Image sources:** Search results and externally hosted image URLs depend on third-party services and host permissions. A remote image may load in the app but fail to export if its host blocks cross-origin canvas access.
- **Anime and character search:** Availability and rate limits depend on the external service used by the search feature.
- **Connectivity:** Loading the hosted app and some image-editing/search features requires an internet connection.

## Development

The project uses vanilla JavaScript ES modules, HTML, and CSS. Cropper.js is loaded from cdnjs.

Run the browser regression suite with:

```bash
npm install
npx playwright install chromium
npm test
```

The GitHub Actions workflow also checks JavaScript syntax and runs the browser tests on pushes to `main` and pull requests targeting `main`.

## Project structure

```text
.
├── index.html                 # Application markup
├── style.css                  # Entry point for CSS modules
├── css/                       # Layout, editor, search, library, and theme styles
├── js/
│   ├── main.js                # Application entry point
│   ├── board.js               # Grid rendering and layout settings
│   ├── gridDetection.js       # Grid dimension detection
│   ├── screenshotReconstruction.js
│   ├── cropper/               # Image editing operations and state
│   ├── images/                # Import, URL, drag-and-drop, and search features
│   ├── library/               # Saved-grid and category interface
│   └── storage/               # IndexedDB persistence and migrations
├── tests/                     # Playwright regression tests
├── assets/                    # Application assets
└── .github/workflows/         # Automated checks
```
