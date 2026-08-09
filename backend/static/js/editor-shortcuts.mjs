const shortcutDefinitions = {
    undo: { keys: ["Mod-z"], display: "Mod+Z" },
    redo: { keys: ["Mod-Shift-z", "Mod-y"], display: "Mod+Shift+Z" },
    bold: { keys: ["Mod-b"], display: "Mod+B" },
    italic: { keys: ["Mod-i"], display: "Mod+I" },
    underline: { keys: ["Mod-u"], display: "Mod+U" },
    strikethrough: { keys: ["Alt-%", "Alt-Shift-5"], display: "Alt+Shift+5" },
    clearFormatting: { keys: ["Mod-\\"], display: "Mod+\\" },
    fontSizeIncrease: { keys: ["Mod->", "Mod-Shift-."], display: "Mod+Shift+." },
    fontSizeDecrease: { keys: ["Mod-<", "Mod-Shift-,"], display: "Mod+Shift+," },
    indentIncrease: { keys: ["Mod-]"], display: "Mod+]" },
    indentDecrease: { keys: ["Mod-["], display: "Mod+[" },
    normalText: { keys: ["Mod-Alt-0"], display: "Mod+Alt+0" },
    heading1: { keys: ["Mod-Alt-1"], display: "Mod+Alt+1" },
    heading2: { keys: ["Mod-Alt-2"], display: "Mod+Alt+2" },
    heading3: { keys: ["Mod-Alt-3"], display: "Mod+Alt+3" },
    heading4: { keys: ["Mod-Alt-4"], display: "Mod+Alt+4" },
    alignLeft: { keys: ["Mod-Shift-l"], display: "Mod+Shift+L" },
    alignCenter: { keys: ["Mod-Shift-e"], display: "Mod+Shift+E" },
    alignRight: { keys: ["Mod-Shift-r"], display: "Mod+Shift+R" },
    alignJustify: { keys: ["Mod-Shift-j"], display: "Mod+Shift+J" },
    orderedList: { keys: ["Mod-Shift-7"], display: "Mod+Shift+7" },
    bulletList: { keys: ["Mod-Shift-8"], display: "Mod+Shift+8" },
};

export const GOOGLE_DOCS_SHORTCUTS = Object.freeze(
    Object.fromEntries(
        Object.entries(shortcutDefinitions).map(([action, definition]) => [
            action,
            Object.freeze({ ...definition, keys: Object.freeze([...definition.keys]) }),
        ]),
    ),
);

export function createGoogleDocsShortcutMap(handlers) {
    const shortcuts = {};

    Object.entries(GOOGLE_DOCS_SHORTCUTS).forEach(([action, definition]) => {
        const handler = handlers[action];
        if (typeof handler !== "function") return;
        definition.keys.forEach((key) => { shortcuts[key] = handler; });
    });

    return shortcuts;
}

export function shortcutLabel(action, platform = globalThis.navigator?.platform || "") {
    const definition = GOOGLE_DOCS_SHORTCUTS[action];
    if (!definition) return "";
    const isApple = /Mac|iPhone|iPad|iPod/i.test(platform);
    return definition.display
        .replaceAll("Mod", isApple ? "Cmd" : "Ctrl")
        .replaceAll("Alt", isApple ? "Option" : "Alt");
}
