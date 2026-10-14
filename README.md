# Grid Generator

A browser-based tool for building image grids and collages. Arrange images in a customizable layout, edit each image, save grids into a personal library, and export the finished board.

## Features

- **Custom layouts:** Choose 1–10 rows and columns and select an image aspect ratio.
- **Board styling:** Adjust spacing, background color, and image borders.
- **Image importing:** Add images from your device, bulk-import multiple images, drag and drop files, use an image URL, or search available image sources.
- **Image editing:** Crop, rotate, flip, and adjust image appearance with brightness, contrast, saturation, blur, and filters.
- **Saved grids:** Create, rename, search, and organize grids into nested categories.
- **Undo and redo:** Step back through supported board changes.
- **Export:** Download the board as PNG, JPG, or WebP.

The app is built with vanilla JavaScript ES modules, HTML, and CSS. Cropper.js is used for image editing.

## Run locally

No build step or package installation is currently required.

Because the app uses JavaScript modules, open it through a local HTTP server rather than opening `index.html` directly as a `file://` URL.

For example, if Python is installed:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser from the project directory.

You can also use a local development server provided by your editor.

## Data and image sources

- Saved grids and related library data are stored in the browser, so they are tied to that browser and its site storage. Clearing browser data may remove them.
- Cropper.js is loaded from cdnjs.
- Anime and character search uses an unofficial Jikan-compatible service. Its availability and rate limits are controlled by that external service, not by this project.
- Image URLs from external sites may fail to load or export when the remote host blocks access or cross-origin canvas use.

## Project structure

```text
.
├── index.html          # App markup
├── style.css           # Imports the CSS modules
├── css/                # Feature and layout styles
└── js/
    ├── main.js         # Application entry point and event wiring
    ├── board.js        # Grid board rendering and settings
    ├── history.js      # Undo/redo behavior
    ├── download.js     # Board export
    ├── images/         # Image import, editing, and search features
    ├── library/        # Saved grids and category UI
    └── storage/        # Grid/category persistence
```

## Status

This project is under active development. Features and implementation details may change as the app evolves.
