export const appState = {

    // ========================================
    // Grid Library
    // ========================================

    currentGridId: null,

    currentGridName: "Untitled Grid",


    // ========================================
    // Cropper
    // ========================================

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
    //     originalSource: original image data URL,
    //
    //     crop: {
    //         x,
    //         y,
    //         width,
    //         height
    //     },
    //
    //     rotation: 0,
    //
    //     flip: {
    //         horizontal: false,
    //         vertical: false
    //     },
    //
    //     filter: "none",
    //
    //     adjustments: {
    //         brightness: 0,
    //         contrast: 0,
    //         saturation: 0,
    //         blur: 0
    //     },
    //
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

    borderEnabled: true,

    borderSize: 2,

    borderColor: "#9ca3af",


    // ========================================
    // Undo / Redo
    // ========================================

    undoStack: [],

    redoStack: []

};