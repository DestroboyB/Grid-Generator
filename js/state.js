export const appState = {

    // Cropper
    cropper: null,

    selectedDiv: null,

    menuDiv: null,

    currentObjectURL: null,


    // ========================================
    // Images
    // ========================================



// Each entry is either null or:
//
// {
//     source: original image data URL,
//     crop: {
//         x,
//         y,
//         width,
//         height
//     },
//     x: 0,
//     y: 0,
//     zoom: 1
// }

savedImages: [],


    // ========================================
    // Board Settings
    // ========================================

    spacing: 0,

    backgroundColor: "#ffffff",


    // ========================================
    // Undo / Redo
    // ========================================

    undoStack: [],

    redoStack: []

};