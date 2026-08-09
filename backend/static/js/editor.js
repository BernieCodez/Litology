import { Editor, Extension, Node } from "https://esm.sh/@tiptap/core@3.29.2";
import StarterKit from "https://esm.sh/@tiptap/starter-kit@3.29.2";
import Placeholder from "https://esm.sh/@tiptap/extension-placeholder@3.29.2";
import { TextAlign } from "https://esm.sh/@tiptap/extension-text-align@3.29.2";
import { TextStyleKit } from "https://esm.sh/@tiptap/extension-text-style@3.29.2";
import { NodeSelection, Plugin, TextSelection } from "https://esm.sh/@tiptap/pm@3.29.2/state";
import { Decoration, DecorationSet } from "https://esm.sh/@tiptap/pm@3.29.2/view";
import {
    applyChapterSettings,
    chapterContentFromTemplate,
    chapterVariableQuery,
    DEFAULT_CHAPTER_SETTINGS,
    insertChapterNumberVariable,
    normalizeChapterSettings,
    normalizeSceneSeparator,
    openingTextRange,
    OPTIONAL_LOCAL_FONT_OPTIONS,
    sceneBreakAttributes,
    sceneBreakContentWithDefaults,
    sceneSeparatorSymbol,
    STYLE_DEFINITIONS,
    settingsWithMatchedTextStyle,
    styleKeyForAttributes,
} from "/static/js/chapter-customization.mjs?v=20260808-8";
import {
    enhanceColorPickers,
    setColorPickerValue,
} from "/static/js/color-picker.mjs?v=20260808-3";
import {
    enhanceAllSelects,
    refreshCustomSelect,
} from "/static/js/custom-select.mjs?v=20260808-4";
import {
    filterFontCatalog,
    googleFontPreviewStylesheetUrl,
    googleFontStylesheetUrl,
    isBuiltInFont,
    isOptionalLocalFont,
    loadLocalFont,
    loadImportedFonts,
    saveImportedFonts,
} from "/static/js/font-library.mjs?v=20260808-3";
import {
    FONT_SIZE_PRESETS,
    formatFontSize,
    normalizeFontSize,
    parseFontSize,
    stepFontSize,
} from "/static/js/font-size-picker.mjs";
import {
    effectiveFormatIsActive,
    inheritedFormatIsActive,
    INLINE_FORMATS,
} from "/static/js/formatting-overrides.mjs?v=20260808-1";
import {
    createGoogleDocsShortcutMap,
    shortcutLabel,
} from "/static/js/editor-shortcuts.mjs?v=20260808-1";
import {
    EDITOR_ZOOM_LEVELS,
    editorZoomShortcutDirection,
    normalizeEditorZoom,
    stepEditorZoom,
} from "/static/js/editor-zoom.mjs?v=20260808-1";
import {
    findTextMatches,
    initialMatchIndex,
    steppedMatchIndex,
} from "/static/js/editor-find.mjs?v=20260808-1";
import {
    analyzeText,
    grammarQuality,
    suggestionLabel,
} from "/static/js/grammar-engine.mjs?v=20260807-3";
import {
    cleanProjectName,
    loadProjectNames,
    nextAvailableProjectName,
    projectChaptersPath,
    projectDocumentPath,
    saveProjectNames,
} from "/static/js/project-names.mjs";
import {
    isSingleSelectedWord,
} from "/static/js/synonyms.mjs?v=20260808-2";
import { fetchDictionaryEntry } from "/static/js/dictionary.mjs?v=20260809-1";

const AUTOSAVE_DELAY = 1200;
const projectId = document.body.dataset.projectId;
const defaultProjectNames = JSON.parse(
    document.querySelector("#default-project-names")?.textContent || "{}"
);
const projectNames = loadProjectNames(defaultProjectNames);
const projectNameButton = document.querySelector("[data-project-name]");
const projectTitleDisplay = document.querySelector("[data-project-title-display]");
const projectRenameForm = document.querySelector("[data-project-rename-form]");
const projectNameInput = document.querySelector("[data-project-name-input]");
const startRenameButtons = document.querySelectorAll("[data-start-rename], [data-project-name]");
const cancelRenameButton = document.querySelector("[data-cancel-rename]");
const saveState = document.querySelector(".save-state");
const saveStateLabel = document.querySelector("[data-save-state-label]");
const chapterStack = document.querySelector("[data-chapter-stack]");
const chapterNavigation = document.querySelector("[data-chapter-navigation]");
const bookScroll = document.querySelector("[data-book-scroll]");
const findReplaceBar = document.querySelector("[data-find-replace]");
const findInput = document.querySelector("[data-find-input]");
const replaceInput = document.querySelector("[data-replace-input]");
const findCount = document.querySelector("[data-find-count]");
const findPreviousButton = document.querySelector("[data-find-previous]");
const findNextButton = document.querySelector("[data-find-next]");
const closeFindButton = document.querySelector("[data-close-find]");
const replaceOneButton = document.querySelector("[data-replace-one]");
const replaceAllButton = document.querySelector("[data-replace-all]");
const findCaseSensitiveButton = document.querySelector("[data-find-case-sensitive]");
const findWholeWordButton = document.querySelector("[data-find-whole-word]");
const findScopeControl = document.querySelector("[data-find-scope]");
const toolbarButtons = [...document.querySelectorAll("[data-command]")];
const alignmentMenu = document.querySelector("[data-alignment-menu]");
const alignmentIcon = document.querySelector("[data-alignment-icon]");
const fontFamilyControl = document.querySelector("[data-font-family]");
const fontSizePicker = document.querySelector("[data-font-size-picker]");
const fontSizeInput = document.querySelector("[data-font-size-input]");
const decreaseFontSizeButton = document.querySelector("[data-font-size-decrease]");
const increaseFontSizeButton = document.querySelector("[data-font-size-increase]");
const fontColorControl = document.querySelector("[data-font-color]");
const fontColorSwatch = document.querySelector("[data-font-color-swatch]");
const fontColorTrigger = fontColorControl.closest("[data-color-picker]")
    .querySelector("[data-color-picker-trigger]");
const highlightColorControl = document.querySelector("[data-highlight-color]");
const highlightSwatch = document.querySelector("[data-highlight-swatch]");
const highlightColorTrigger = highlightColorControl.closest("[data-color-picker]")
    .querySelector("[data-color-picker-trigger]");
const lineHeightControl = document.querySelector("[data-line-height]");
const blockStyleControl = document.querySelector("[data-block-style]");
const chapterCustomizerButton = document.querySelector("[data-open-chapter-customizer]");
const chapterCustomizer = document.querySelector("[data-chapter-customizer]");
const chapterTemplateToolbarActions = document.querySelector("[data-template-toolbar-actions]");
const closeChapterCustomizerButton = document.querySelector("[data-close-chapter-customizer]");
const applyChapterTemplateButton = document.querySelector("[data-apply-chapter-template]");
const resetChapterTemplateButton = document.querySelector("[data-reset-chapter-template]");
const chapterTemplatePreview = document.querySelector("[data-chapter-template-preview]");
const chapterTemplateEditorElement = document.querySelector("[data-chapter-template-editor]");
const chapterVariableMenu = document.querySelector("[data-chapter-variable-menu]");
const insertChapterVariableButton = document.querySelector("[data-insert-chapter-variable]");
const chapterSettingsButton = document.querySelector("[data-open-chapter-settings]");
const chapterSettingsBackdrop = document.querySelector("[data-chapter-settings-backdrop]");
const chapterSettingsDialog = document.querySelector("[data-chapter-settings-dialog]");
const closeChapterSettingsButton = document.querySelector("[data-close-chapter-settings]");
const cancelChapterSettingsButton = document.querySelector("[data-cancel-chapter-settings]");
const saveChapterSettingsButton = document.querySelector("[data-save-chapter-settings]");
const openingEnabledControl = document.querySelector("[data-opening-enabled]");
const chapterOpeningLayoutControl = document.querySelector("[data-opening-layout]");
const customSceneDividerInput = document.querySelector("[data-custom-scene-divider]");
const customDividerField = document.querySelector("[data-custom-divider-field]");
const insertSceneBreakButton = document.querySelector("[data-insert-scene-break]");
const sceneBreakPopover = document.querySelector("[data-scene-break-popover]");
const closeSceneBreakPopoverButton = document.querySelector("[data-close-scene-break-popover]");
const editorMain = document.querySelector(".editor-main");
const formatToolbar = document.querySelector(".format-toolbar");
const statusBar = document.querySelector(".status-bar");
const statusValues = document.querySelectorAll(".status-group:first-child span");
const zoomControl = document.querySelector("[data-zoom-control]");
const zoomTrigger = document.querySelector("[data-zoom-trigger]");
const zoomValue = document.querySelector("[data-zoom-value]");
const zoomMenu = document.querySelector("[data-zoom-menu]");
const zoomOutButton = document.querySelector("[data-zoom-out]");
const zoomInButton = document.querySelector("[data-zoom-in]");
const zoomLevelButtons = [...document.querySelectorAll("[data-zoom-level]")];
const sidebarWordCount = document.querySelector(".sidebar-footer strong");
const assistantHome = document.querySelector("[data-assistant-home]");
const assistantTabs = [...document.querySelectorAll(".assistant-tabs button")];
const openDictionaryButton = document.querySelector("[data-open-dictionary]");
const dictionaryPanel = document.querySelector("[data-dictionary-panel]");
const closeDictionaryButton = document.querySelector("[data-close-dictionary]");
const dictionaryForm = document.querySelector("[data-dictionary-form]");
const dictionaryInput = document.querySelector("[data-dictionary-input]");
const dictionaryStatus = document.querySelector("[data-dictionary-status]");
const dictionaryResults = document.querySelector("[data-dictionary-results]");
const dictionaryExampleButtons = [...document.querySelectorAll("[data-dictionary-example]")];
const openGrammarButton = document.querySelector("[data-open-grammar]");
const grammarPanel = document.querySelector("[data-grammar-panel]");
const closeGrammarButton = document.querySelector("[data-close-grammar]");
const grammarScore = document.querySelector("[data-grammar-score]");
const grammarProgress = document.querySelector("[data-grammar-progress]");
const grammarChapter = document.querySelector("[data-grammar-chapter]");
const grammarSummary = document.querySelector("[data-grammar-summary]");
const grammarIssueList = document.querySelector("[data-grammar-issues]");
const grammarCheckState = document.querySelector("[data-grammar-check-state]");
const grammarCheckNowButton = document.querySelector("[data-check-grammar-now]");
const grammarQualityCard = document.querySelector("[data-grammar-quality-card]");
const grammarPopover = document.querySelector("[data-grammar-popover]");
const grammarPopoverType = document.querySelector("[data-grammar-popover-type]");
const grammarPopoverSuggestion = document.querySelector("[data-grammar-popover-suggestion]");
const grammarPopoverMessage = document.querySelector("[data-grammar-popover-message]");
const grammarAcceptButton = document.querySelector("[data-grammar-accept]");
const grammarDismissButton = document.querySelector("[data-grammar-dismiss]");
const selectionPopover = document.querySelector("[data-selection-popover]");
const selectionActions = document.querySelector("[data-selection-actions]");
const selectionDefineButton = document.querySelector("[data-selection-define]");
const selectionSynonymsButton = document.querySelector("[data-selection-synonyms]");
const selectionUpdateStyleButton = document.querySelector("[data-selection-update-style]");
const synonymView = document.querySelector("[data-synonym-view]");
const closeSynonymsButton = document.querySelector("[data-close-synonyms]");
const synonymWord = document.querySelector("[data-synonym-word]");
const synonymStatus = document.querySelector("[data-synonym-status]");
const synonymList = document.querySelector("[data-synonym-list]");
const fontLibrary = document.querySelector("[data-font-library]");
const fontLibraryBackdrop = document.querySelector("[data-font-library-backdrop]");
const fontSearch = document.querySelector("[data-font-search]");
const fontResults = document.querySelector("[data-font-results]");
const fontLibraryStatus = document.querySelector("[data-font-library-status]");
const fontSelects = [
    fontFamilyControl,
];
const chapterStates = [];
let importedFonts = loadImportedFonts();
const availableLocalFonts = new Set();
let googleFontCatalog = null;
let googleFontCatalogPromise = null;
let grammarSyncFrame = null;
let activeGrammarIssue = null;
let grammarPopoverCloseTimeout = null;
let grammarPopoverAnimationTimeout = null;
let englishSpellchecker = null;
let grammarDictionaryStatus = "loading";
let activeTextSelection = null;
let activeColorFormattingSelection = null;
let synonymRequestController = null;
let dictionaryRequestController = null;
let selectionPopoverAnimationTimeout = null;
let fontSearchTimer = null;
let fontLibraryTarget = null;
let fontLibraryTrigger = null;
let fontSizeMenu = null;
let fontSizeMenuMode = null;
let activeChapter = null;
let currentChapter = null;
let chapterTemplateSettings = normalizeChapterSettings(DEFAULT_CHAPTER_SETTINGS);
let chapterTemplateDraft = normalizeChapterSettings(DEFAULT_CHAPTER_SETTINGS);
let chapterCustomizerOpen = false;
let chapterSettingsOpen = false;
let chapterSettingsDraft = normalizeChapterSettings(DEFAULT_CHAPTER_SETTINGS);
let chapterSettingsPreviousFocus = null;
let activeSceneBreak = null;
let templateChapter = null;
let chapterVariableTarget = null;
let chapterVariableEditorRange = null;
let revisionClock = Date.now();
let addChapterInProgress = false;
let scrollFrame = null;
let editorZoom = 100;
const findState = {
    open: false,
    query: "",
    caseSensitive: false,
    wholeWord: false,
    scope: "chapter",
    scopeChapter: null,
    matches: [],
    currentIndex: -1,
    savedChapter: null,
    savedSelection: null,
    refreshFrame: null,
};
let currentProjectName = projectNames[projectId]
    || projectNameButton?.textContent.trim()
    || "Untitled Project";

function syncBlockStylePreviews(value = chapterTemplateSettings) {
    const settings = normalizeChapterSettings(value);
    STYLE_DEFINITIONS.forEach(({ key }) => {
        const option = [...blockStyleControl.options].find((candidate) => candidate.value === key);
        const style = key === "opening" ? settings.opening : settings.styles[key];
        if (!option || !style) return;
        option.dataset.previewStyle = "true";
        option.dataset.previewFontFamily = style.fontFamily;
        option.dataset.previewFontSize = `${style.fontSize}px`;
        option.dataset.previewColor = style.color;
        option.dataset.previewFontWeight = style.bold ? "700" : "400";
        option.dataset.previewFontStyle = style.italic ? "italic" : "normal";
        option.dataset.previewTextDecoration = style.underline ? "underline" : "none";
    });
    refreshCustomSelect(blockStyleControl);
}

function ensureGoogleFontLoaded(family) {
    if (!family || isBuiltInFont(family)) return;
    const existing = [...document.querySelectorAll("link[data-google-font-family]")]
        .find((link) => (
            link.dataset.googleFontFamily === family
            && link.dataset.googleFontKind === "full"
        ));
    if (existing) return;
    document.querySelectorAll('link[data-google-font-kind="preview"]').forEach((link) => {
        if (link.dataset.googleFontFamily === family) link.remove();
    });
    const url = googleFontStylesheetUrl(family);
    if (!url) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.googleFontFamily = family;
    link.dataset.googleFontKind = "full";
    document.head.append(link);
}

function loadGoogleFontPreviews(families) {
    const previewFamilies = families.filter(
        (family) => !isBuiltInFont(family) && !importedFonts.includes(family)
    );
    const url = googleFontPreviewStylesheetUrl(previewFamilies);
    if (!url) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.googleFontKind = "preview";
    document.head.append(link);
}

function clearGoogleFontPreviews() {
    document.querySelectorAll('link[data-google-font-kind="preview"]').forEach((link) => link.remove());
}

function addFontOption(family) {
    fontSelects.forEach((select) => {
        if (!select || [...select.options].some((option) => option.value === family)) return;
        const option = new Option(family, family);
        option.dataset.fontFamily = family;
        const actionOption = [...select.options].find((candidate) => candidate.dataset.action);
        select.add(option, actionOption || null);
        refreshCustomSelect(select);
    });
}

function registerImportedFont(family, { persist = true } = {}) {
    if (!family) return;
    if (isOptionalLocalFont(family) && !availableLocalFonts.has(family)) return;
    ensureGoogleFontLoaded(family);
    addFontOption(family);
    if (!isBuiltInFont(family) && !importedFonts.includes(family)) {
        importedFonts = [...importedFonts, family].sort((a, b) => a.localeCompare(b));
        if (persist) importedFonts = saveImportedFonts(importedFonts);
    }
}

fontSelects.forEach((select) => {
    [...select.options].forEach((option) => {
        if (option.value && !option.dataset.action) option.dataset.fontFamily = option.value;
    });
});
importedFonts.forEach((family) => registerImportedFont(family, { persist: false }));
enhanceAllSelects();
enhanceColorPickers();

async function loadOptionalLocalFonts() {
    const availability = await Promise.all(OPTIONAL_LOCAL_FONT_OPTIONS.map(async (family) => ({
        family,
        supported: await loadLocalFont(family),
    })));

    availability.forEach(({ family, supported }) => {
        if (!supported) return;
        availableLocalFonts.add(family);
        addFontOption(family);
    });
    syncToolbar();
}

void loadOptionalLocalFonts();

const commandMap = {
    bold: { command: "toggleBold", active: "bold" },
    italic: { command: "toggleItalic", active: "italic" },
    underline: { command: "toggleUnderline", active: "underline" },
    strikethrough: { command: "toggleStrike", active: "strike" },
    bulletList: { command: "toggleBulletList", active: "bulletList" },
    orderedList: { command: "toggleOrderedList", active: "orderedList" },
    undo: { command: "undo", history: true },
    redo: { command: "redo", history: true },
};

function inheritedFormattingState(editor, format) {
    if (!editor) return false;
    const styleKey = activeReusableStyleKey(activeChapter);
    return inheritedFormatIsActive(reusableStyleSettings(activeChapter, styleKey), format);
}

function effectiveFormattingState(editor, format) {
    const config = INLINE_FORMATS[format];
    if (!editor || !config) return false;
    const textStyle = editor.getAttributes("textStyle") || {};
    return effectiveFormatIsActive({
        inherited: inheritedFormattingState(editor, format),
        marked: editor.isActive(format),
        override: textStyle[config.overrideAttribute],
    });
}

function toggleInlineFormatting(editor, format) {
    const config = INLINE_FORMATS[format];
    if (!editor || !config) return false;
    const inherited = inheritedFormattingState(editor, format);
    const textStyle = editor.getAttributes("textStyle") || {};
    const hasOffOverride = textStyle[config.overrideAttribute] === "off";
    const isActive = effectiveFormatIsActive({
        inherited,
        marked: editor.isActive(format),
        override: textStyle[config.overrideAttribute],
    });
    let chain = editor.chain().focus();

    if (isActive) {
        chain = chain[config.unsetCommand]();
        if (inherited) {
            chain = chain.setMark("textStyle", { [config.overrideAttribute]: "off" });
        }
    } else {
        if (hasOffOverride) {
            chain = chain.setMark("textStyle", { [config.overrideAttribute]: null });
        }
        if (!inherited) {
            chain = chain[config.setCommand]();
        }
    }
    const didRun = chain.run();
    syncToolbar();
    return didRun;
}

function runToolbarCommand(editor, action) {
    const config = commandMap[action];
    if (!editor || !config || typeof editor.chain().focus()[config.command] !== "function") {
        return false;
    }
    if (["bold", "italic", "underline"].includes(config.active)) {
        prepareOpeningStyleOverride(editor);
    }
    if (INLINE_FORMATS[config.active]) {
        return toggleInlineFormatting(editor, config.active);
    }
    return editor.chain().focus()[config.command]().run();
}

const inheritedFormattingOverrideExtension = Extension.create({
    name: "inheritedFormattingOverrides",
    addGlobalAttributes() {
        return [{
            types: ["textStyle"],
            attributes: Object.fromEntries(Object.values(INLINE_FORMATS).map((config) => [
                config.overrideAttribute,
                {
                    default: null,
                    parseHTML: (element) => (
                        element.getAttribute(config.dataAttribute) === "off"
                            ? "off"
                            : null
                    ),
                    renderHTML: (attributes) => (
                        attributes[config.overrideAttribute] === "off"
                            ? { [config.dataAttribute]: "off" }
                            : {}
                    ),
                },
            ])),
        }];
    },
});

function changeBlockIndent(editor, direction) {
    if (!editor) return false;
    const nodeName = activeBlockNodeName(editor);
    const currentIndent = Number(editor.getAttributes(nodeName).indent) || 0;
    const indent = Math.min(6, Math.max(0, currentIndent + direction));
    if (indent === currentIndent) return true;
    return editor.chain().focus().updateAttributes(nodeName, { indent }).run();
}

function changeFontSizeFromKeyboard(editor, direction) {
    if (!editor) return false;
    const currentSize = currentEditorFontSize();
    closeFontSizeMenu();
    applyFontSize(stepFontSize(currentSize, direction, currentSize));
    return true;
}

const googleDocsShortcutsExtension = Extension.create({
    name: "googleDocsKeyboardShortcuts",
    priority: 1100,
    addKeyboardShortcuts() {
        const editor = this.editor;
        const setAlignment = (alignment) => () => (
            editor.chain().focus().setTextAlign(alignment).run()
        );
        const setHeading = (level) => () => (
            editor.chain().focus().setHeading({ level }).run()
        );

        return createGoogleDocsShortcutMap({
            undo: () => runToolbarCommand(editor, "undo"),
            redo: () => runToolbarCommand(editor, "redo"),
            bold: () => runToolbarCommand(editor, "bold"),
            italic: () => runToolbarCommand(editor, "italic"),
            underline: () => runToolbarCommand(editor, "underline"),
            strikethrough: () => runToolbarCommand(editor, "strikethrough"),
            clearFormatting: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
            fontSizeIncrease: () => changeFontSizeFromKeyboard(editor, 1),
            fontSizeDecrease: () => changeFontSizeFromKeyboard(editor, -1),
            indentIncrease: () => changeBlockIndent(editor, 1),
            indentDecrease: () => changeBlockIndent(editor, -1),
            normalText: () => editor.chain().focus().setParagraph().run(),
            heading1: setHeading(1),
            heading2: setHeading(2),
            heading3: setHeading(3),
            heading4: setHeading(4),
            alignLeft: setAlignment("left"),
            alignCenter: setAlignment("center"),
            alignRight: setAlignment("right"),
            alignJustify: setAlignment("justify"),
            orderedList: () => runToolbarCommand(editor, "orderedList"),
            bulletList: () => runToolbarCommand(editor, "bulletList"),
        });
    },
});

function titleWithShortcut(label, action) {
    const shortcut = shortcutLabel(action);
    return shortcut ? `${label} (${shortcut})` : label;
}

document.querySelectorAll("[data-shortcut-action]").forEach((control) => {
    const label = control.getAttribute("aria-label") || control.title;
    if (label) control.title = titleWithShortcut(label, control.dataset.shortcutAction);
});

const chapterVariableExtension = Extension.create({
    name: "chapterVariableAutocomplete",
    priority: 1000,
    addKeyboardShortcuts() {
        const insertVariable = () => {
            if (
                chapterVariableTarget?.kind !== "editor"
                || !chapterVariableEditorRange
                || chapterVariableMenu.hidden
            ) return false;
            const { from, to } = chapterVariableEditorRange;
            const transaction = this.editor.state.tr.insertText("@chapter_number", from, to);
            hideChapterVariableMenu();
            this.editor.view.dispatch(transaction.scrollIntoView());
            return true;
        };
        return {
            Enter: insertVariable,
            Tab: insertVariable,
        };
    },
});

function sceneBreakSettingsForEditor(editor) {
    if (templateChapter?.editor === editor) return chapterTemplateDraft;
    return chapterStates.find((chapter) => chapter.editor === editor)?.settings
        || chapterTemplateSettings;
}

const sceneBreakExtension = Node.create({
    name: "horizontalRule",
    group: "block",
    atom: true,
    selectable: true,

    addAttributes() {
        return {
            preset: { default: "line" },
            custom: { default: "◆◆◆" },
            color: { default: "#536b45" },
            thickness: { default: 2 },
        };
    },

    parseHTML() {
        return [{
            tag: "hr",
            getAttrs: (element) => normalizeSceneSeparator({
                preset: element.getAttribute("data-scene-preset"),
                custom: element.getAttribute("data-scene-custom"),
                color: element.getAttribute("data-scene-color"),
                thickness: element.getAttribute("data-scene-thickness"),
            }),
        }];
    },

    renderHTML({ node }) {
        const sceneBreak = normalizeSceneSeparator(node.attrs);
        return ["hr", {
            "data-scene-break": "",
            "data-scene-preset": sceneBreak.preset,
            "data-scene-custom": sceneBreak.custom,
            "data-scene-symbol": sceneSeparatorSymbol({ sceneSeparator: sceneBreak }),
            "data-scene-color": sceneBreak.color,
            "data-scene-thickness": String(sceneBreak.thickness),
            style: [
                `--scene-break-color: ${sceneBreak.color}`,
                `--scene-break-thickness: ${sceneBreak.thickness}px`,
                `--scene-break-double-stop: ${sceneBreak.thickness * 2}px`,
                `--scene-break-double-height: ${sceneBreak.thickness * 3}px`,
                `--scene-break-wave-height: ${8 + (sceneBreak.thickness * 2)}px`,
            ].join("; "),
        }];
    },

    addProseMirrorPlugins() {
        const editor = this.editor;
        return [new Plugin({
            appendTransaction(transactions, _oldState, newState) {
                if (!transactions.some((transaction) => transaction.docChanged)) return null;
                const matches = [];
                newState.doc.forEach((node, position) => {
                    if (node.type.name === "paragraph" && node.textContent === "***") {
                        matches.push({ node, position });
                    }
                });
                if (!matches.length) return null;

                const transaction = newState.tr;
                const attributes = sceneBreakAttributes(sceneBreakSettingsForEditor(editor));
                [...matches].reverse().forEach(({ node, position }) => {
                    transaction.replaceWith(position, position + node.nodeSize, [
                        newState.schema.nodes.horizontalRule.create(attributes),
                        newState.schema.nodes.paragraph.create(),
                    ]);
                });
                const lastPosition = Math.min(
                    transaction.doc.content.size,
                    matches[0].position + 2,
                );
                transaction.setSelection(TextSelection.near(transaction.doc.resolve(lastPosition), 1));
                return transaction;
            },
        })];
    },
});

const indentExtension = Extension.create({
    name: "blockIndent",
    addGlobalAttributes() {
        return [{
            types: ["paragraph", "heading"],
            attributes: {
                indent: {
                    default: 0,
                    parseHTML: (element) => Number(element.getAttribute("data-indent")) || 0,
                    renderHTML: (attributes) => (
                        attributes.indent > 0
                            ? { "data-indent": String(Math.min(6, attributes.indent)) }
                            : {}
                    ),
                },
            },
        }];
    },
});

function openingTextExtension(chapter) {
    return Extension.create({
        name: `openingText${chapter.number}`,
        addProseMirrorPlugins() {
            return [new Plugin({
                props: {
                    decorations(state) {
                        const mode = chapter.settings.opening.mode;
                        if (mode === "none") return DecorationSet.empty;
                        const range = openingRangeForDocument(state.doc, mode);
                        if (!range) return DecorationSet.empty;
                        const className = openingRangeHasStyleOverride(state.doc, range)
                            ? "chapter-opening-text has-style-override"
                            : "chapter-opening-text";
                        const openingDecoration = Decoration.inline(
                            range.from,
                            range.to,
                            { class: className }
                        );

                        return openingDecoration
                            ? DecorationSet.create(state.doc, [openingDecoration])
                            : DecorationSet.empty;
                    },
                },
            })];
        },
    });
}

function openingRangeHasStyleOverride(documentNode, range) {
    let hasOverride = false;
    documentNode.nodesBetween(range.from, range.to, (node) => {
        if (hasOverride || !node.isText) return;
        const textStyle = node.marks.find((mark) => mark.type.name === "textStyle");
        hasOverride = Boolean(
            textStyle
            && Object.values(textStyle.attrs || {}).some((value) => value != null && value !== "")
        );
    });
    return hasOverride;
}

function openingRangeForDocument(documentNode, mode) {
    if (mode === "none") return null;
    let result = null;
    documentNode.forEach((node, position) => {
        if (result || node.type.name !== "paragraph") return;
        const range = openingTextRange(node.textContent, mode);
        if (!range) return;
        result = {
            from: position + 1 + range.from,
            to: position + 1 + range.to,
        };
    });
    return result;
}

function openingRangeForChapter(chapter) {
    if (!chapter?.editor || chapter.editor.isDestroyed) return null;
    return openingRangeForDocument(chapter.editor.state.doc, chapter.settings.opening.mode);
}

function selectionUsesOpeningStyle(chapter, from, to) {
    const range = openingRangeForChapter(chapter);
    if (!range) return false;
    if (from === to) return from >= range.from && from <= range.to;
    return from >= range.from && to <= range.to;
}

function searchableTextSegments(documentNode) {
    const segments = [];

    documentNode.descendants((node, position) => {
        if (!node.isTextblock) return true;
        let text = "";
        let positions = [];
        const flush = () => {
            if (text) segments.push({ text, positions });
            text = "";
            positions = [];
        };

        node.descendants((child, childPosition) => {
            if (child.isText && child.text) {
                for (let index = 0; index < child.text.length; index += 1) {
                    text += child.text[index];
                    positions.push(position + 1 + childPosition + index);
                }
            } else if (child.isLeaf) {
                flush();
            }
            return !child.isTextblock;
        });
        flush();
        return false;
    });

    return segments;
}

function searchRangesForDocument(documentNode) {
    if (!findState.open || !findState.query) return [];
    const ranges = [];

    searchableTextSegments(documentNode).forEach(({ text, positions }) => {
        findTextMatches(text, findState.query, {
            caseSensitive: findState.caseSensitive,
            wholeWord: findState.wholeWord,
        }).forEach((match) => {
            ranges.push({
                from: positions[match.from],
                to: positions[match.to - 1] + 1,
            });
        });
    });

    return ranges;
}

function searchDecorations(documentNode, chapter) {
    const current = findState.matches[findState.currentIndex];
    const decorations = searchRangesForDocument(documentNode).map((range) => {
        const isCurrent = current
            && current.chapter === chapter
            && current.from === range.from
            && current.to === range.to;
        return Decoration.inline(range.from, range.to, {
            class: isCurrent ? "find-match is-current" : "find-match",
            ...(isCurrent ? { "data-find-current": "" } : {}),
        });
    });
    return DecorationSet.create(documentNode, decorations);
}

function findReplaceExtension(chapter) {
    return Extension.create({
        name: `findReplace${chapter.number}`,
        addProseMirrorPlugins() {
            const searchPlugin = new Plugin({
                state: {
                    init: (_, state) => searchDecorations(state.doc, chapter),
                    apply(transaction, decorations, _oldState, newState) {
                        if (transaction.docChanged || transaction.getMeta("findRefresh")) {
                            return searchDecorations(newState.doc, chapter);
                        }
                        return decorations.map(transaction.mapping, transaction.doc);
                    },
                },
                props: {
                    decorations: (state) => searchPlugin.getState(state),
                },
            });
            return [searchPlugin];
        },
    });
}

function chaptersInFindScope() {
    if (findState.scope === "book") return chapterStates;
    const chapter = chapterStates.includes(findState.scopeChapter)
        ? findState.scopeChapter
        : currentChapter || chapterStates[0];
    return chapter ? [chapter] : [];
}

function currentFindMatch() {
    return findState.matches[findState.currentIndex] || null;
}

function refreshFindDecorations() {
    chapterStates.forEach((chapter) => {
        if (!chapter.editor || chapter.editor.isDestroyed) return;
        chapter.editor.view.dispatch(chapter.editor.state.tr.setMeta("findRefresh", true));
    });
}

function syncFindControls() {
    const matchCount = findState.matches.length;
    findCount.textContent = findState.query && matchCount
        ? `${findState.currentIndex + 1} of ${matchCount}`
        : `0 of ${matchCount}`;
    [findPreviousButton, findNextButton, replaceOneButton, replaceAllButton]
        .forEach((button) => { button.disabled = matchCount === 0; });
}

function findAnchor() {
    const chapter = findState.scope === "chapter"
        ? findState.scopeChapter || currentChapter
        : findState.savedChapter || currentChapter;
    const savedPosition = findState.savedSelection?.from !== findState.savedSelection?.to
        ? findState.savedSelection?.from
        : findState.savedSelection?.to;
    const position = chapter === findState.savedChapter
        ? savedPosition ?? chapter?.editor?.state.selection.to ?? 0
        : chapter?.editor?.state.selection.to ?? 0;
    return { chapter, position };
}

function syncFindResults({ resetCurrent = false, preferredMatch = null, scroll = true } = {}) {
    const previous = resetCurrent ? null : (preferredMatch || currentFindMatch());
    findState.matches = chaptersInFindScope().flatMap((chapter) => (
        searchRangesForDocument(chapter.editor.state.doc).map((range) => ({ chapter, ...range }))
    ));

    if (!findState.matches.length) {
        findState.currentIndex = -1;
    } else if (previous) {
        const exactIndex = findState.matches.findIndex((match) => (
            match.chapter === previous.chapter
            && match.from === previous.from
            && match.to === previous.to
        ));
        const followingIndex = findState.matches.findIndex((match) => (
            match.chapter === previous.chapter && match.from >= previous.from
        ));
        findState.currentIndex = exactIndex >= 0
            ? exactIndex
            : followingIndex >= 0 ? followingIndex : 0;
    } else {
        const anchor = findAnchor();
        findState.currentIndex = initialMatchIndex(
            findState.matches,
            anchor.chapter,
            anchor.position,
        );
    }

    syncFindControls();
    refreshFindDecorations();
    if (scroll) scrollCurrentFindMatch();
}

function scheduleFindResultsSync() {
    if (!findState.open || findState.refreshFrame !== null) return;
    findState.refreshFrame = window.requestAnimationFrame(() => {
        findState.refreshFrame = null;
        syncFindResults({ scroll: false });
    });
}

function scrollCurrentFindMatch() {
    const match = currentFindMatch();
    if (!match) return;
    setCurrentChapter(match.chapter);
    const highlight = match.chapter.article.querySelector("[data-find-current]");
    highlight?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

function navigateFind(direction) {
    findState.currentIndex = steppedMatchIndex(
        findState.currentIndex,
        findState.matches.length,
        direction,
    );
    syncFindControls();
    refreshFindDecorations();
    scrollCurrentFindMatch();
}

function rememberWriterSelectionForFind(chapter) {
    if (!findState.open || findState.savedChapter !== chapter) return;
    const { anchor, head, from, to } = chapter.editor.state.selection;
    findState.savedSelection = { anchor, head, from, to };
}

function selectedFindText(chapter, selection) {
    if (!chapter || !selection || selection.empty) return "";
    const text = chapter.editor.state.doc.textBetween(selection.from, selection.to, " ", " ");
    return text.length <= 200 && !/[\r\n]/.test(text) ? text : "";
}

function openFindReplace() {
    if (findState.open) {
        findInput.focus();
        findInput.select();
        return;
    }

    const chapter = chapterStates.includes(activeChapter)
        ? activeChapter
        : currentChapter || chapterStates[0];
    if (!chapter) return;
    const selection = chapter.editor.state.selection;
    findState.open = true;
    findState.scopeChapter = chapter;
    findState.savedChapter = chapter;
    findState.savedSelection = {
        anchor: selection.anchor,
        head: selection.head,
        from: selection.from,
        to: selection.to,
    };
    const selectedText = selectedFindText(chapter, selection);
    if (selectedText) findInput.value = selectedText;
    findState.query = findInput.value;
    findReplaceBar.hidden = false;
    syncFindResults({ resetCurrent: true });
    findInput.focus();
    findInput.select();
}

function closeFindReplace({ restoreSelection = true } = {}) {
    if (!findState.open) return;
    if (findState.refreshFrame !== null) {
        window.cancelAnimationFrame(findState.refreshFrame);
        findState.refreshFrame = null;
    }
    const chapter = findState.savedChapter;
    findState.open = false;
    findState.matches = [];
    findState.currentIndex = -1;
    findReplaceBar.hidden = true;
    syncFindControls();
    refreshFindDecorations();

    if (restoreSelection && chapter?.editor && !chapter.editor.isDestroyed) {
        chapter.editor.commands.focus();
    }
}

function replaceCurrentFindMatch() {
    const match = currentFindMatch();
    if (!match) return;
    const currentText = match.chapter.editor.state.doc.textBetween(match.from, match.to);
    if (currentText === replaceInput.value) {
        navigateFind(1);
        return;
    }
    const preferredMatch = { ...match, to: match.from };
    match.chapter.editor.view.dispatch(
        match.chapter.editor.state.tr.insertText(replaceInput.value, match.from, match.to),
    );
    syncFindResults({ preferredMatch });
}

function replaceAllFindMatches() {
    if (!findState.matches.length) return;
    const matchesByChapter = new Map();
    findState.matches.forEach((match) => {
        const currentText = match.chapter.editor.state.doc.textBetween(match.from, match.to);
        if (currentText === replaceInput.value) return;
        const matches = matchesByChapter.get(match.chapter) || [];
        matches.push(match);
        matchesByChapter.set(match.chapter, matches);
    });

    matchesByChapter.forEach((matches, chapter) => {
        const transaction = chapter.editor.state.tr;
        [...matches].reverse().forEach((match) => {
            transaction.insertText(replaceInput.value, match.from, match.to);
        });
        chapter.editor.view.dispatch(transaction);
    });
    syncFindResults({ resetCurrent: true });
}

function grammarIssuesForDocument(documentNode) {
    const issues = [];
    const occurrences = new Map();

    documentNode.descendants((node, position) => {
        if (!node.isText || !node.text) return;
        analyzeText(node.text, {
            offset: position,
            spellchecker: englishSpellchecker,
        }).forEach((issue) => {
            const occurrence = occurrences.get(issue.id) || 0;
            occurrences.set(issue.id, occurrence + 1);
            issues.push({ ...issue, id: `${issue.id}:${occurrence}` });
        });
    });
    return issues;
}

function grammarDecorations(documentNode, chapter) {
    const allIssues = grammarIssuesForDocument(documentNode);
    const openIssues = allIssues.filter((issue) => !chapter.reviewedGrammar.has(issue.id));
    chapter.grammarAllIssues = allIssues;
    chapter.grammarIssues = openIssues;
    scheduleGrammarSidebarSync();

    return DecorationSet.create(documentNode, openIssues.map((issue) => Decoration.inline(
        issue.from,
        issue.to,
        {
            class: `grammar-highlight grammar-highlight--${issue.type}`,
            "data-grammar-issue": issue.id,
            role: "button",
            tabindex: "0",
            "aria-label": `${issue.original}. ${suggestionLabel(issue)}`,
        },
    )));
}

function scheduleGrammarCheck(chapter, delay = 650) {
    clearTimeout(chapter.grammarCheckTimeout);
    chapter.grammarStatus = "checking";
    scheduleGrammarSidebarSync();
    chapter.grammarCheckTimeout = window.setTimeout(() => {
        chapter.grammarCheckTimeout = null;
        if (!chapter.editor || chapter.editor.isDestroyed) return;
        chapter.editor.view.dispatch(
            chapter.editor.state.tr.setMeta("grammarRefresh", true),
        );
        chapter.grammarStatus = "ready";
        chapter.grammarLastChecked = Date.now();
        scheduleGrammarSidebarSync();
    }, delay);
}

async function loadEnglishDictionary() {
    grammarDictionaryStatus = "loading";
    scheduleGrammarSidebarSync();
    try {
        const dictionary = await import(
            "/static/js/english-spellchecker.bundle.mjs?v=20260807-2"
        );
        englishSpellchecker = dictionary.checkEnglishWord;
        grammarDictionaryStatus = "ready";
        chapterStates.forEach((chapter) => {
            if (!chapter.editor || chapter.editor.isDestroyed) return;
            chapter.editor.view.dispatch(
                chapter.editor.state.tr.setMeta("grammarRefresh", true),
            );
            chapter.grammarStatus = "ready";
            chapter.grammarLastChecked = Date.now();
        });
    } catch (error) {
        console.error("The full English spelling dictionary could not be loaded.", error);
        grammarDictionaryStatus = "error";
    }
    scheduleGrammarSidebarSync();
}

function grammarExtension(chapter) {
    return Extension.create({
        name: `grammarChecker${chapter.number}`,
        addProseMirrorPlugins() {
            const grammarPlugin = new Plugin({
                state: {
                    init: (_, state) => grammarDecorations(state.doc, chapter),
                    apply(transaction, decorations, _oldState, newState) {
                        if (transaction.getMeta("grammarRefresh")) {
                            return grammarDecorations(newState.doc, chapter);
                        }
                        if (transaction.docChanged) {
                            scheduleGrammarCheck(chapter);
                        }
                        return decorations.map(transaction.mapping, transaction.doc);
                    },
                },
                props: {
                    decorations: (state) => grammarPlugin.getState(state),
                },
            });
            return [grammarPlugin];
        },
    });
}

function serializedChapter(chapter) {
    return JSON.stringify({ content: chapter.editor.getJSON(), settings: chapter.settings });
}

function chapterFontFamilies(settings) {
    return [
        ...Object.values(settings.styles).map((style) => style.fontFamily),
        settings.numberLabelStyle.fontFamily,
        settings.opening.fontFamily,
    ];
}

function showSaveState(label, state = "saved") {
    saveStateLabel.textContent = label;
    saveState.dataset.state = state;
}

function syncOverallSaveState() {
    const savingChapter = chapterStates.find((chapter) => chapter.saveStatus === "saving");
    const failedChapter = chapterStates.find((chapter) => chapter.saveStatus === "error");

    if (savingChapter) {
        showSaveState(`Saving chapter ${savingChapter.number}…`, "saving");
    } else if (failedChapter) {
        showSaveState(`Chapter ${failedChapter.number} backed up offline`, "error");
    } else {
        showSaveState("Saved");
    }
}

function nextRevision() {
    revisionClock = Math.max(Date.now(), revisionClock + 1);
    return revisionClock;
}

function syncProjectName() {
    projectNameButton.textContent = currentProjectName;
    projectNameButton.setAttribute("aria-label", `Rename ${currentProjectName}`);
    projectNameInput.value = currentProjectName;
    document.title = `${currentProjectName} · Litology`;
}

function startRenamingProject() {
    projectNameInput.value = currentProjectName;
    projectTitleDisplay.hidden = true;
    projectRenameForm.hidden = false;
    projectNameInput.focus();
    projectNameInput.select();
}

function cancelRenamingProject() {
    projectRenameForm.hidden = true;
    projectTitleDisplay.hidden = false;
    projectNameInput.value = currentProjectName;
    projectNameButton.focus();
}

function chapterPath(chapter) {
    return projectDocumentPath(currentProjectName, chapter.number);
}

function backupKey(chapterNumber) {
    return `litology.autosave.${projectId}.${chapterNumber}`;
}

function readBackup(chapterNumber) {
    try {
        const backup = JSON.parse(window.localStorage.getItem(backupKey(chapterNumber)) || "null");
        return backup && typeof backup === "object" && backup.content ? backup : null;
    } catch {
        return null;
    }
}

function writeBackup(chapter) {
    try {
        window.localStorage.setItem(backupKey(chapter.number), JSON.stringify({
            content: chapter.editor.getJSON(),
            settings: chapter.settings,
            client_updated_at: chapter.revision,
            save_path: chapterPath(chapter),
        }));
    } catch (error) {
        console.warn(`Could not back up chapter ${chapter.number} locally.`, error);
    }
}

function removeBackup(chapterNumber) {
    try {
        window.localStorage.removeItem(backupKey(chapterNumber));
    } catch {
        // The server copy remains authoritative if browser storage is read-only.
    }
}

function storedBackupNumbers() {
    const prefix = `litology.autosave.${projectId}.`;
    const numbers = [];

    try {
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);

            if (key?.startsWith(prefix)) {
                const chapterNumber = Number(key.slice(prefix.length));
                if (Number.isInteger(chapterNumber) && chapterNumber > 0) {
                    numbers.push(chapterNumber);
                }
            }
        }
    } catch {
        return [];
    }

    return numbers;
}

function textFromNode(node) {
    if (node?.type === "text") {
        return node.text || "";
    }

    return (node?.content || []).map(textFromNode).join("");
}

function chapterTitle(chapter) {
    const heading = chapter.editor.getJSON().content?.find(
        (node) => node.type === "heading" && node.attrs?.level === 1
    );
    return cleanProjectName(textFromNode(heading)) || `Untitled chapter ${chapter.number}`;
}

function bookStats() {
    const text = chapterStates
        .map((chapter) => chapter.editor.getText().trim())
        .filter(Boolean)
        .join("\n");
    const words = text ? text.split(/\s+/).length : 0;
    return {
        words,
        characters: text.length,
        minutes: words ? Math.max(1, Math.ceil(words / 220)) : 0,
    };
}

function syncStats() {
    const { words, characters, minutes } = bookStats();
    const labels = [
        `${words} ${words === 1 ? "word" : "words"}`,
        `${characters} ${characters === 1 ? "character" : "characters"}`,
        `${minutes} min read`,
    ];

    statusValues.forEach((element, index) => {
        element.textContent = labels[index];
    });

    sidebarWordCount.textContent = labels[0];
}

const EDITOR_ZOOM_STORAGE_KEY = "litology.editorZoom";

function storedEditorZoom() {
    try {
        return normalizeEditorZoom(window.localStorage.getItem(EDITOR_ZOOM_STORAGE_KEY));
    } catch {
        return 100;
    }
}

function closeZoomMenu({ restoreFocus = false } = {}) {
    if (zoomMenu.hidden) return;
    zoomMenu.hidden = true;
    zoomTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) zoomTrigger.focus();
}

function openZoomMenu() {
    zoomMenu.hidden = false;
    zoomTrigger.setAttribute("aria-expanded", "true");
    zoomLevelButtons.find((button) => Number(button.dataset.zoomLevel) === editorZoom)?.focus();
}

function setEditorZoom(value, { persist = true } = {}) {
    const nextZoom = normalizeEditorZoom(value, editorZoom);
    const anchor = activeChapter?.article;
    const anchorTop = anchor?.getBoundingClientRect().top;

    editorZoom = nextZoom;
    bookScroll.style.setProperty("--book-zoom", String(nextZoom / 100));
    zoomValue.textContent = `${nextZoom}%`;
    zoomTrigger.setAttribute("aria-label", `Document zoom, ${nextZoom}%`);
    zoomOutButton.disabled = nextZoom === EDITOR_ZOOM_LEVELS[0];
    zoomInButton.disabled = nextZoom === EDITOR_ZOOM_LEVELS.at(-1);
    zoomLevelButtons.forEach((button) => {
        const selected = Number(button.dataset.zoomLevel) === nextZoom;
        button.setAttribute("aria-checked", String(selected));
    });

    if (anchor && Number.isFinite(anchorTop)) {
        bookScroll.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
    }

    if (persist) {
        try {
            window.localStorage.setItem(EDITOR_ZOOM_STORAGE_KEY, String(nextZoom));
        } catch {
            // Zoom still works when browser storage is unavailable.
        }
    }
}

function issueTypeLabel(type) {
    return ({ spelling: "Typo", grammar: "Grammar", clarity: "Clarity" })[type] || "Suggestion";
}

function closeGrammarPopover() {
    clearTimeout(grammarPopoverCloseTimeout);
    grammarPopoverCloseTimeout = null;
    clearTimeout(grammarPopoverAnimationTimeout);
    grammarPopover.classList.remove("is-visible");
    grammarPopover.classList.add("is-leaving");
    activeGrammarIssue = null;
    grammarPopoverAnimationTimeout = window.setTimeout(() => {
        grammarPopover.hidden = true;
        grammarPopover.classList.remove("is-leaving");
        grammarPopoverAnimationTimeout = null;
    }, 150);
}

function scheduleGrammarPopoverClose() {
    clearTimeout(grammarPopoverCloseTimeout);
    grammarPopoverCloseTimeout = window.setTimeout(closeGrammarPopover, 180);
}

function grammarHighlightForIssue(chapter, issue) {
    return [...chapter.article.querySelectorAll("[data-grammar-issue]")]
        .find((element) => element.dataset.grammarIssue === issue.id) || null;
}

function positionGrammarPopover(anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    grammarPopover.hidden = false;
    const popoverRect = grammarPopover.getBoundingClientRect();
    const gap = 9;
    const left = Math.max(12, Math.min(
        anchorRect.left,
        window.innerWidth - popoverRect.width - 12,
    ));
    const roomBelow = window.innerHeight - anchorRect.bottom;
    const top = roomBelow >= popoverRect.height + gap
        ? anchorRect.bottom + gap
        : Math.max(12, anchorRect.top - popoverRect.height - gap);
    grammarPopover.style.left = `${left}px`;
    grammarPopover.style.top = `${top}px`;
}

function openGrammarPopover(chapter, issue, anchor) {
    clearTimeout(grammarPopoverCloseTimeout);
    grammarPopoverCloseTimeout = null;
    clearTimeout(grammarPopoverAnimationTimeout);
    grammarPopoverAnimationTimeout = null;
    grammarPopover.classList.remove("is-leaving");
    activeGrammarIssue = { chapter, issue };
    grammarPopover.dataset.issueType = issue.type;
    grammarPopoverType.textContent = issueTypeLabel(issue.type);
    grammarPopoverSuggestion.textContent = suggestionLabel(issue);
    grammarPopoverMessage.textContent = issue.message;
    positionGrammarPopover(anchor);
    window.requestAnimationFrame(() => {
        if (!grammarPopover.hidden) grammarPopover.classList.add("is-visible");
    });
}

function focusGrammarIssue(chapter, issue, { showPopover = true } = {}) {
    setActiveChapter(chapter);
    const transaction = chapter.editor.state.tr
        .setSelection(TextSelection.create(chapter.editor.state.doc, issue.from, issue.to))
        .scrollIntoView();
    chapter.editor.view.dispatch(transaction);
    chapter.editor.commands.focus();

    window.requestAnimationFrame(() => {
        const highlight = grammarHighlightForIssue(chapter, issue);
        if (highlight && showPopover) openGrammarPopover(chapter, issue, highlight);
    });
}

function reviewGrammarIssue(chapter, issue, action) {
    if (!chapter?.grammarIssues.some((candidate) => candidate.id === issue.id)) return;
    chapter.reviewedGrammar.add(issue.id);
    let transaction = chapter.editor.state.tr;

    if (action === "accept") {
        if (issue.replacement) {
            transaction = transaction.insertText(issue.replacement, issue.from, issue.to);
        } else if (issue.replacement === "") {
            transaction = transaction.delete(issue.from, issue.to);
        }
    }

    transaction.setMeta("grammarRefresh", true);
    chapter.editor.view.dispatch(transaction);
    chapter.grammarStatus = "ready";
    chapter.grammarLastChecked = Date.now();
    closeGrammarPopover();
    scheduleGrammarSidebarSync();
}

function renderGrammarIssueCard(chapter, issue, index) {
    const card = document.createElement("article");
    card.className = "grammar-issue-card";
    card.dataset.issueType = issue.type;
    card.tabIndex = 0;
    card.innerHTML = `
        <header><span></span><small></small></header>
        <strong></strong>
        <p></p>
        <div class="grammar-card-actions">
            <button class="grammar-dismiss-button" type="button">Dismiss</button>
            <button class="grammar-accept-button" type="button">Accept</button>
        </div>
    `;
    card.querySelector("header span").textContent = issueTypeLabel(issue.type);
    card.querySelector("header small").textContent = String(index + 1).padStart(2, "0");
    card.querySelector("strong").textContent = suggestionLabel(issue);
    card.querySelector("p").textContent = issue.message;
    card.addEventListener("click", () => focusGrammarIssue(chapter, issue));
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            focusGrammarIssue(chapter, issue);
        }
    });
    card.querySelector(".grammar-dismiss-button").addEventListener("click", (event) => {
        event.stopPropagation();
        reviewGrammarIssue(chapter, issue, "dismiss");
    });
    card.querySelector(".grammar-accept-button").addEventListener("click", (event) => {
        event.stopPropagation();
        reviewGrammarIssue(chapter, issue, "accept");
    });
    return card;
}

function syncGrammarSidebar() {
    grammarSyncFrame = null;
    const chapter = activeChapter;
    if (!chapter?.editor) return;
    const issues = chapter.grammarIssues || [];
    const score = grammarQuality(chapter.editor.getText(), issues);
    const issueLabel = `${issues.length} ${issues.length === 1 ? "suggestion" : "suggestions"}`;
    const isDictionaryLoading = grammarDictionaryStatus === "loading";
    const isChecking = chapter.grammarStatus === "checking" || isDictionaryLoading;

    grammarChapter.textContent = `Chapter ${chapter.number}`;
    grammarCheckState.dataset.state = isChecking ? "checking" : grammarDictionaryStatus;
    grammarCheckState.querySelector("span").textContent = isDictionaryLoading
        ? "Loading the full English dictionary…"
        : chapter.grammarStatus === "checking"
            ? "Checking this chapter…"
            : grammarDictionaryStatus === "error"
                ? "Basic checks active · dictionary unavailable"
                : "Full dictionary ready · checks 0.65s after typing stops";
    grammarCheckNowButton.disabled = isChecking;
    grammarQualityCard.classList.toggle("is-checking", isChecking);
    grammarScore.textContent = `${score}%`;
    grammarProgress.setAttribute("aria-valuenow", String(score));
    grammarProgress.querySelector("span").style.width = `${score}%`;
    grammarSummary.textContent = issues.length
        ? `${issueLabel} left to review. Accepting or dismissing improves this score.`
        : "Everything in this chapter has been reviewed.";

    grammarIssueList.replaceChildren();
    if (issues.length) {
        issues.forEach((issue, index) => {
            grammarIssueList.append(renderGrammarIssueCard(chapter, issue, index));
        });
    } else {
        const emptyState = document.createElement("div");
        emptyState.className = "grammar-perfect-state";
        emptyState.innerHTML = `
            <span aria-hidden="true"><i class="fa-solid fa-check"></i></span>
            <strong>Looking polished</strong>
            <p>No open spelling, grammar, or clarity suggestions in this chapter.</p>
        `;
        grammarIssueList.append(emptyState);
    }
}

function scheduleGrammarSidebarSync() {
    if (grammarSyncFrame !== null) return;
    grammarSyncFrame = window.requestAnimationFrame(syncGrammarSidebar);
}

function openGrammarPanel({ focusBackButton = true } = {}) {
    assistantHome.hidden = true;
    dictionaryPanel.hidden = true;
    dictionaryRequestController?.abort();
    grammarPanel.hidden = false;
    assistantTabs.forEach((tab) => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
    });
    if (activeChapter?.grammarStatus !== "checking") {
        scheduleGrammarCheck(activeChapter, 180);
    }
    syncGrammarSidebar();
    if (focusBackButton) closeGrammarButton.focus();
}

function closeGrammarPanel() {
    grammarPanel.hidden = true;
    assistantHome.hidden = false;
    closeGrammarPopover();
    assistantTabs[0]?.classList.add("is-active");
    assistantTabs[0]?.setAttribute("aria-selected", "true");
    openGrammarButton.focus();
}

function setDictionaryStatus(message = "", state = "") {
    dictionaryStatus.textContent = message;
    dictionaryStatus.dataset.state = state;
}

function dictionaryTermSection(title, terms) {
    if (!terms.length) return null;
    const section = document.createElement("section");
    section.className = "dictionary-term-section";
    const heading = document.createElement("h4");
    heading.textContent = title;
    const list = document.createElement("div");
    terms.forEach((term) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = term;
        button.addEventListener("click", () => {
            dictionaryInput.value = term;
            void lookupDictionaryWord(term);
        });
        list.append(button);
    });
    section.append(heading, list);
    return section;
}

function renderDictionaryEntry(entry) {
    dictionaryResults.replaceChildren();
    const article = document.createElement("article");
    article.className = "dictionary-entry";
    const header = document.createElement("header");
    const headingGroup = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = entry.word;
    headingGroup.append(heading);
    if (entry.phonetic) {
        const phonetic = document.createElement("span");
        phonetic.textContent = entry.phonetic;
        headingGroup.append(phonetic);
    }
    header.append(headingGroup);
    if (entry.audio) {
        const audio = new Audio(entry.audio);
        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "dictionary-audio-button";
        playButton.setAttribute("aria-label", `Hear ${entry.word} pronounced`);
        playButton.innerHTML = '<i class="fa-solid fa-volume-high" aria-hidden="true"></i>';
        playButton.addEventListener("click", () => void audio.play());
        header.append(playButton);
    }
    article.append(header);

    entry.meanings.forEach((meaning) => {
        const section = document.createElement("section");
        section.className = "dictionary-meaning";
        const label = document.createElement("h4");
        label.textContent = meaning.partOfSpeech;
        const list = document.createElement("ol");
        meaning.definitions.forEach(({ definition, example }) => {
            const item = document.createElement("li");
            const text = document.createElement("p");
            text.textContent = definition;
            item.append(text);
            if (example) {
                const usage = document.createElement("blockquote");
                usage.textContent = `“${example}”`;
                item.append(usage);
            }
            list.append(item);
        });
        section.append(label, list);
        article.append(section);
    });

    const synonyms = dictionaryTermSection("Synonyms", entry.synonyms);
    const antonyms = dictionaryTermSection("Antonyms", entry.antonyms);
    if (synonyms) article.append(synonyms);
    if (antonyms) article.append(antonyms);
    dictionaryResults.append(article);
}

function renderDictionaryEmpty(word) {
    dictionaryResults.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "dictionary-not-found";
    empty.innerHTML = `
        <span aria-hidden="true"><i class="fa-solid fa-feather-pointed"></i></span>
        <strong>No entry found</strong>
        <p>We couldn’t find “${word}.” Check the spelling or try another form of the word.</p>
    `;
    dictionaryResults.append(empty);
}

async function lookupDictionaryWord(value = dictionaryInput.value) {
    dictionaryRequestController?.abort();
    const controller = new AbortController();
    dictionaryRequestController = controller;
    dictionaryResults.classList.add("is-loading");
    setDictionaryStatus("Looking through the shelves…", "loading");
    try {
        const entry = await fetchDictionaryEntry(value, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (entry) {
            dictionaryInput.value = entry.word;
            renderDictionaryEntry(entry);
            setDictionaryStatus(`${entry.meanings.length} ${entry.meanings.length === 1 ? "meaning" : "meanings"} found`, "success");
        } else {
            renderDictionaryEmpty(value.trim());
            setDictionaryStatus("Try a different spelling or word form.", "empty");
        }
    } catch (error) {
        if (controller.signal.aborted) return;
        if (error.code === "INVALID_QUERY") {
            setDictionaryStatus(error.message, "error");
            dictionaryInput.focus();
        } else {
            console.error("Could not load dictionary entry.", error);
            setDictionaryStatus("The dictionary is unavailable right now. Check your connection and try again.", "error");
        }
    } finally {
        if (dictionaryRequestController === controller) dictionaryRequestController = null;
        dictionaryResults.classList.remove("is-loading");
    }
}

function openDictionaryPanel() {
    assistantHome.hidden = true;
    grammarPanel.hidden = true;
    closeGrammarPopover();
    dictionaryPanel.hidden = false;
    assistantTabs.forEach((tab) => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
    });
    window.requestAnimationFrame(() => dictionaryInput.focus());
}

function closeDictionaryPanel() {
    dictionaryRequestController?.abort();
    dictionaryRequestController = null;
    dictionaryPanel.hidden = true;
    assistantHome.hidden = false;
    assistantTabs[0]?.classList.add("is-active");
    assistantTabs[0]?.setAttribute("aria-selected", "true");
    openDictionaryButton.focus();
}

function positionSelectionPopover(clientX, clientY) {
    selectionPopover.hidden = false;
    const rect = selectionPopover.getBoundingClientRect();
    selectionPopover.style.left = `${Math.max(10, Math.min(clientX, window.innerWidth - rect.width - 10))}px`;
    selectionPopover.style.top = `${Math.max(10, Math.min(clientY, window.innerHeight - rect.height - 10))}px`;
}

function showSelectionActions() {
    synonymRequestController?.abort();
    synonymRequestController = null;
    selectionActions.hidden = false;
    synonymView.hidden = true;
    selectionPopover.classList.remove("is-synonyms");
    synonymStatus.className = "synonym-status";
    synonymStatus.textContent = "";
    synonymList.replaceChildren();
    if (activeTextSelection) {
        positionSelectionPopover(activeTextSelection.clientX, activeTextSelection.clientY);
    }
}

function closeSelectionPopover() {
    synonymRequestController?.abort();
    synonymRequestController = null;
    clearTimeout(selectionPopoverAnimationTimeout);
    selectionPopover.classList.remove("is-visible");
    activeTextSelection = null;
    selectionPopoverAnimationTimeout = window.setTimeout(() => {
        selectionPopover.hidden = true;
        showSelectionActions();
        selectionPopoverAnimationTimeout = null;
    }, 140);
}

function openSelectionPopover(selectionContext) {
    clearTimeout(selectionPopoverAnimationTimeout);
    selectionPopoverAnimationTimeout = null;
    activeTextSelection = selectionContext;
    showSelectionActions();
    const isSingleWord = isSingleSelectedWord(selectionContext.text);
    selectionDefineButton.hidden = !isSingleWord;
    selectionSynonymsButton.hidden = !isSingleWord;
    selectionContext.styleMatch = selectedReusableStyle(
        selectionContext.chapter,
        selectionContext.from,
        selectionContext.to,
    );
    selectionUpdateStyleButton.disabled = !selectionContext.styleMatch;
    selectionUpdateStyleButton.title = selectionContext.styleMatch
        ? `Update the ${selectionContext.styleMatch.label} style across this project`
        : "Select text using one reusable style";
    positionSelectionPopover(selectionContext.clientX, selectionContext.clientY);
    window.requestAnimationFrame(() => selectionPopover.classList.add("is-visible"));
}

function defineSelectedWord() {
    const word = activeTextSelection?.text.trim();
    if (!isSingleSelectedWord(word)) return;
    closeSelectionPopover();
    openDictionaryPanel();
    dictionaryInput.value = word;
    void lookupDictionaryWord(word);
}

function selectedReusableStyle(chapter, from, to) {
    const editor = chapter.editor;
    const blocks = [];
    editor.state.doc.nodesBetween(from, to, (node) => {
        if (!["paragraph", "heading"].includes(node.type.name)) return;
        blocks.push({
            key: node.type.name === "heading" ? styleKeyForAttributes(node.attrs) : "normal",
            attributes: node.attrs || {},
        });
    });
    const isOpeningText = selectionUsesOpeningStyle(chapter, from, to);
    const keys = isOpeningText
        ? new Set(["opening"])
        : new Set(blocks.map(({ key }) => key));
    if (keys.size !== 1) return null;
    const key = isOpeningText ? "opening" : blocks[0]?.key;
    const textNode = editor.state.doc.nodeAt(from);
    const marks = (textNode?.marks || editor.state.doc.resolve(from).marks()).map(
        (mark) => mark.type.name,
    );
    const textStyle = (textNode?.marks || editor.state.doc.resolve(from).marks())
        .find((mark) => mark.type.name === "textStyle")?.attrs || {};
    return {
        key,
        label: STYLE_DEFINITIONS.find((definition) => definition.key === key)?.label || key,
        textStyle,
        marks,
        explicitFormatting: Object.keys(textStyle).length > 0 || marks.length > 0,
        blockAttributes: blocks[0].attributes,
    };
}

function updateReusableStyleFromSelection() {
    const selectionContext = activeTextSelection;
    const match = selectionContext?.styleMatch;
    if (!selectionContext || !match) return;

    chapterTemplateSettings = settingsWithMatchedTextStyle(
        chapterTemplateSettings,
        match.key,
        match,
    );
    chapterTemplateDraft = normalizeChapterSettings(chapterTemplateSettings);
    syncBlockStylePreviews(chapterTemplateSettings);
    chapterFontFamilies(chapterTemplateSettings).forEach((family) => {
        if (!isBuiltInFont(family)) registerImportedFont(family);
    });
    showSaveState(`Updating ${match.label} styleâ€¦`, "saving");
    chapterStates.forEach((chapter) => {
        chapter.settings = normalizeChapterSettings(chapterTemplateSettings);
        applyChapterSettings(chapter.article, chapter.settings);
        chapter.revision = nextRevision();
        writeBackup(chapter);
        scheduleChapterSave(chapter, 0);
    });

    const editor = selectionContext.chapter.editor;
    let transaction = editor.state.tr;
    ["textStyle", "bold", "italic", "underline"].forEach((markName) => {
        const markType = editor.state.schema.marks[markName];
        if (markType) transaction = transaction.removeMark(
            selectionContext.from,
            selectionContext.to,
            markType,
        );
    });
    if (transaction.docChanged) editor.view.dispatch(transaction);
    syncToolbar();
    closeSelectionPopover();
}

function replaceSelectedText(replacement) {
    const selectionContext = activeTextSelection;
    if (!selectionContext?.chapter?.editor || selectionContext.chapter.editor.isDestroyed) return;
    const editor = selectionContext.chapter.editor;
    const currentText = editor.state.doc.textBetween(
        selectionContext.from,
        selectionContext.to,
        " ",
        " ",
    );
    if (currentText !== selectionContext.text) {
        synonymStatus.className = "synonym-status";
        synonymStatus.textContent = "The selection changed. Select the word again to replace it.";
        return;
    }
    const transaction = editor.state.tr.insertText(
        replacement,
        selectionContext.from,
        selectionContext.to,
    );
    transaction.setSelection(TextSelection.near(
        transaction.doc.resolve(selectionContext.from + replacement.length),
        1,
    ));
    editor.view.dispatch(transaction.scrollIntoView());
    editor.commands.focus();
    closeSelectionPopover();
}

async function showDictionarySynonyms() {
    const selectionContext = activeTextSelection;
    if (!selectionContext || !isSingleSelectedWord(selectionContext.text)) return;
    selectionActions.hidden = true;
    synonymView.hidden = false;
    selectionPopover.classList.add("is-synonyms");
    synonymWord.textContent = selectionContext.text;
    synonymList.replaceChildren();
    synonymStatus.className = "synonym-status is-loading";
    synonymStatus.textContent = "Finding synonyms…";
    positionSelectionPopover(selectionContext.clientX, selectionContext.clientY);

    synonymRequestController?.abort();
    const controller = new AbortController();
    synonymRequestController = controller;
    try {
        const entry = await fetchDictionaryEntry(selectionContext.text, {
            signal: controller.signal,
        });
        if (controller.signal.aborted || activeTextSelection !== selectionContext) return;
        const synonyms = entry?.synonyms || [];
        synonymStatus.className = "synonym-status";
        synonymStatus.textContent = synonyms.length
            ? `${synonyms.length} synonyms from your word reference.`
            : "No synonyms were found for this word.";
        synonyms.forEach((synonym) => {
            const button = document.createElement("button");
            button.type = "button";
            const label = document.createElement("span");
            label.textContent = synonym;
            button.append(label);
            button.addEventListener("click", () => replaceSelectedText(synonym));
            synonymList.append(button);
        });
        positionSelectionPopover(selectionContext.clientX, selectionContext.clientY);
    } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Could not load dictionary synonyms.", error);
        synonymStatus.className = "synonym-status";
        synonymStatus.textContent = "Synonyms are unavailable right now. Check your connection and try again.";
    } finally {
        if (synonymRequestController === controller) synonymRequestController = null;
    }
}

function chapterTemplateTargetSettings() {
    if (chapterTemplateTarget === "number") return chapterTemplateDraft.numberLabelStyle;
    if (chapterTemplateTarget === "opening") return chapterTemplateDraft.opening;
    return chapterTemplateDraft.styles[chapterTemplateTarget] || chapterTemplateDraft.styles.normal;
}

function patchChapterTemplateTarget(patch) {
    const target = chapterTemplateTargetSettings();
    Object.assign(target, patch);
    chapterTemplateDraft = normalizeChapterSettings(chapterTemplateDraft);
    renderChapterTemplateDraft();
    syncToolbar();
}

function setChapterTemplateTarget(target) {
    if (!["number", "opening", ...STYLE_DEFINITIONS.map(({ key }) => key)].includes(target)) return;
    chapterTemplateTarget = target;
    renderChapterTemplateDraft();
    syncToolbar();
}

function openingPreviewText(mode) {
    return ({
        character: "T",
        word: "The",
        sentence: "The first light found the windows.",
    })[mode] || "";
}

function renderChapterTemplateDraft() {
    chapterTemplateDraft = normalizeChapterSettings(chapterTemplateDraft);
    applyChapterSettings(chapterTemplatePreview, chapterTemplateDraft);
    syncBlockStylePreviews(chapterTemplateDraft);

    if (document.activeElement !== chapterNumberTemplateInput) {
        chapterNumberTemplateInput.value = chapterTemplateDraft.numberLabel;
    }
    if (document.activeElement !== chapterNameTemplateInput) {
        chapterNameTemplateInput.value = chapterTemplateDraft.chapterName;
    }
    openingLayoutControl.value = chapterTemplateDraft.opening.layout;
    customSceneDividerInput.value = chapterTemplateDraft.sceneSeparator.custom;
    customDividerField.hidden = chapterTemplateDraft.sceneSeparator.preset !== "custom";

    const openingSample = chapterTemplatePreview.querySelector("[data-template-opening-sample]");
    openingSample.textContent = openingPreviewText(chapterTemplateDraft.opening.mode);
    openingSample.hidden = chapterTemplateDraft.opening.mode === "none";

    document.querySelectorAll("[data-template-target-button]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.templateTargetButton === chapterTemplateTarget);
    });
    chapterTemplatePreview.querySelectorAll("[data-template-target]").forEach((element) => {
        element.classList.toggle("is-template-target", element.dataset.templateTarget === chapterTemplateTarget);
    });
    document.querySelectorAll("[data-opening-mode] button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === chapterTemplateDraft.opening.mode);
    });
    document.querySelectorAll("[data-scene-divider-presets] button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === chapterTemplateDraft.sceneSeparator.preset);
    });
    refreshCustomSelect(openingLayoutControl);
}

function syncChapterTemplateToolbar() {
    const target = chapterTemplateTargetSettings();
    const isReusableStyle = Object.hasOwn(chapterTemplateDraft.styles, chapterTemplateTarget);
    const supportsAlignment = chapterTemplateTarget !== "opening";

    toolbarButtons.forEach((button) => {
        const command = button.dataset.command;
        const property = ({ bold: "bold", italic: "italic", underline: "underline" })[command];
        const supported = Boolean(property && (property !== "underline" || isReusableStyle));
        button.disabled = !supported;
        button.classList.toggle("is-active", Boolean(property && target[property]));
        button.setAttribute("aria-pressed", String(Boolean(property && target[property])));
    });

    [fontFamilyControl, fontColorControl, fontSizeInput, decreaseFontSizeButton, increaseFontSizeButton]
        .forEach((control) => { control.disabled = false; });
    [highlightColorControl].forEach((control) => { control.disabled = true; });
    alignmentMenu.disabled = !supportsAlignment;
    lineHeightControl.disabled = !isReusableStyle;
    blockStyleControl.disabled = false;

    fontFamilyControl.value = target.fontFamily;
    if (document.activeElement !== fontSizeInput) fontSizeInput.value = formatFontSize(target.fontSize);
    setColorPickerValue(fontColorControl, target.color);
    alignmentMenu.value = supportsAlignment ? (target.alignment || "left") : "left";
    syncAlignmentIcon(alignmentMenu.value);
    lineHeightControl.value = isReusableStyle ? String(target.lineHeight || "") : "";
    blockStyleControl.value = isReusableStyle ? chapterTemplateTarget : "normal";
    [fontFamilyControl, lineHeightControl, blockStyleControl, alignmentMenu].forEach(refreshCustomSelect);
    syncFontSizeOptions();
}

function legacyOpenChapterCustomizer() {
    chapterTemplateDraft = normalizeChapterSettings(chapterTemplateSettings);
    chapterTemplateTarget = "h1";
    chapterCustomizerOpen = true;
    bookScroll.hidden = true;
    statusBar.hidden = true;
    chapterCustomizer.hidden = false;
    editorMain.classList.add("is-template-page");
    formatToolbar.classList.add("is-template-toolbar");
    chapterCustomizerButton.setAttribute("aria-expanded", "true");
    closeGrammarPopover();
    closeFontSizeMenu();
    renderChapterTemplateDraft();
    syncToolbar();
    closeChapterCustomizerButton.focus();
}

function legacyCloseChapterCustomizer({ restoreFocus = true } = {}) {
    if (!chapterCustomizerOpen) return;
    chapterCustomizerOpen = false;
    chapterCustomizer.hidden = true;
    bookScroll.hidden = false;
    statusBar.hidden = false;
    editorMain.classList.remove("is-template-page");
    formatToolbar.classList.remove("is-template-toolbar");
    chapterCustomizerButton.setAttribute("aria-expanded", "false");
    chapterVariableMenu.hidden = true;
    setActiveChapter(currentChapter || chapterStates[0]);
    if (restoreFocus) chapterCustomizerButton.focus();
}

function updateUntouchedChapterName(chapter, previousName, nextName) {
    const content = chapter.editor.getJSON();
    const heading = content.content?.find((node) => node.type === "heading" && node.attrs?.level === 1);
    const currentName = cleanProjectName(textFromNode(heading));
    if (!heading || ![previousName, "Chapter Name"].includes(currentName) || currentName === nextName) return;
    heading.content = [{ type: "text", text: nextName }];
    chapter.editor.commands.setContent(content);
}

function legacyApplyChapterTemplate() {
    const previousSettings = normalizeChapterSettings(chapterTemplateSettings);
    chapterTemplateSettings = normalizeChapterSettings(chapterTemplateDraft);
    applyChapterTemplateButton.disabled = true;
    showSaveState("Applying chapter templateâ€¦", "saving");

    chapterFontFamilies(chapterTemplateSettings).forEach((family) => {
        if (!isBuiltInFont(family)) registerImportedFont(family);
    });
    chapterStates.forEach((chapter) => {
        chapter.settings = normalizeChapterSettings(chapterTemplateSettings);
        applyChapterSettings(chapter.article, chapter.settings);
        updateUntouchedChapterName(chapter, previousSettings.chapterName, chapter.settings.chapterName);
        updateChapterIdentity(chapter);
        chapter.revision = nextRevision();
        writeBackup(chapter);
        scheduleChapterSave(chapter, 0);
    });

    applyChapterTemplateButton.disabled = false;
    closeChapterCustomizer({ restoreFocus: false });
    chapterCustomizerButton.focus();
}

function legacyResetChapterTemplate() {
    chapterTemplateDraft = normalizeChapterSettings(DEFAULT_CHAPTER_SETTINGS);
    chapterTemplateTarget = "h1";
    renderChapterTemplateDraft();
    syncToolbar();
}

function legacySyncChapterVariableMenu() {
    const query = chapterVariableQuery(
        chapterNumberTemplateInput.value,
        chapterNumberTemplateInput.selectionStart,
    );
    chapterVariableMenu.hidden = !query
        || query.query === "chapter_number"
        || !"chapter_number".startsWith(query.query);
}

function legacyInsertChapterVariable() {
    const insertion = insertChapterNumberVariable(
        chapterNumberTemplateInput.value,
        chapterNumberTemplateInput.selectionStart,
    );
    if (!insertion) return;
    chapterNumberTemplateInput.value = insertion.value;
    chapterTemplateDraft.numberLabel = insertion.value;
    chapterVariableMenu.hidden = true;
    renderChapterTemplateDraft();
    chapterNumberTemplateInput.focus();
    chapterNumberTemplateInput.setSelectionRange(insertion.cursor, insertion.cursor);
}

function hideChapterVariableMenu() {
    chapterVariableMenu.hidden = true;
    chapterVariableTarget = null;
    chapterVariableEditorRange = null;
}

function positionChapterVariableMenu(rect) {
    chapterVariableMenu.hidden = false;
    const menuRect = chapterVariableMenu.getBoundingClientRect();
    chapterVariableMenu.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - menuRect.width - 10))}px`;
    chapterVariableMenu.style.top = `${Math.max(10, rect.top - menuRect.height - 8)}px`;
}

function isChapterVariableSuggestion(query) {
    return query && query.query !== "chapter_number" && "chapter_number".startsWith(query.query);
}

function syncLabelVariableMenu(input, chapter = null) {
    const query = chapterVariableQuery(input.value, input.selectionStart);
    if (!isChapterVariableSuggestion(query)) {
        hideChapterVariableMenu();
        return;
    }
    chapterVariableTarget = { kind: "input", input, chapter };
    chapterVariableEditorRange = null;
    positionChapterVariableMenu(input.getBoundingClientRect());
}

function templateEditorVariableRange() {
    const editor = templateChapter?.editor;
    const selection = editor?.state.selection;
    if (!editor || !selection?.empty || !selection.$from.parent.isTextblock) return null;
    const textBeforeCursor = selection.$from.parent.textBetween(0, selection.$from.parentOffset, " ", " ");
    const query = chapterVariableQuery(textBeforeCursor, textBeforeCursor.length);
    if (!isChapterVariableSuggestion(query)) return null;
    return {
        from: selection.$from.start() + query.from,
        to: selection.from,
    };
}

function syncTemplateEditorVariableMenu() {
    if (!chapterCustomizerOpen || activeChapter !== templateChapter) return;
    const range = templateEditorVariableRange();
    if (!range) {
        if (chapterVariableTarget?.kind === "editor") hideChapterVariableMenu();
        return;
    }
    chapterVariableTarget = { kind: "editor" };
    chapterVariableEditorRange = range;
    const coordinates = templateChapter.editor.view.coordsAtPos(range.to);
    positionChapterVariableMenu({ left: coordinates.left, top: coordinates.top });
}

function createTemplateEditor() {
    if (templateChapter) return;
    templateChapter = {
        number: 1,
        article: chapterTemplatePreview,
        editor: null,
        settings: chapterTemplateDraft,
    };
    applyChapterSettings(chapterTemplatePreview, chapterTemplateDraft);
    templateChapter.editor = new Editor({
        element: chapterTemplateEditorElement,
        editorProps: {
            attributes: {
                spellcheck: "false",
                autocorrect: "off",
                "data-gramm": "false",
                "data-gramm_editor": "false",
                "data-enable-grammarly": "false",
                "aria-label": "Chapter template content",
            },
        },
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                horizontalRule: false,
            }),
            TextStyleKit,
            inheritedFormattingOverrideExtension,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            googleDocsShortcutsExtension,
            indentExtension,
            sceneBreakExtension,
            chapterVariableExtension,
            Placeholder.configure({ placeholder: "Build the starting content for every new chapterâ€¦" }),
        ],
        content: sceneBreakContentWithDefaults(
            chapterTemplateDraft.templateContent,
            chapterTemplateDraft,
        ),
        onFocus: () => {
            activeChapter = templateChapter;
            syncToolbar();
        },
        onUpdate: () => {
            chapterTemplateDraft.templateContent = templateChapter.editor.getJSON();
            syncToolbar();
            syncTemplateEditorVariableMenu();
        },
        onSelectionUpdate: () => {
            activeChapter = templateChapter;
            syncToolbar();
            syncTemplateEditorVariableMenu();
        },
    });
}

function openChapterCustomizer() {
    if (findState.open) closeFindReplace({ restoreSelection: false });
    chapterTemplateDraft = normalizeChapterSettings(chapterTemplateSettings);
    chapterCustomizerOpen = true;
    bookScroll.hidden = true;
    chapterCustomizer.hidden = false;
    chapterTemplateToolbarActions.hidden = false;
    chapterCustomizerButton.setAttribute("aria-expanded", "true");
    closeGrammarPopover();
    closeSelectionPopover();
    closeFontSizeMenu();
    createTemplateEditor();
    templateChapter.settings = chapterTemplateDraft;
    applyChapterSettings(chapterTemplatePreview, chapterTemplateDraft);
    templateChapter.editor.commands.setContent(sceneBreakContentWithDefaults(
        chapterTemplateDraft.templateContent,
        chapterTemplateDraft,
    ));
    activeChapter = templateChapter;
    syncToolbar();
    closeChapterCustomizerButton.focus();
}

function closeChapterCustomizer({ restoreFocus = true } = {}) {
    if (!chapterCustomizerOpen) return;
    chapterCustomizerOpen = false;
    chapterCustomizer.hidden = true;
    bookScroll.hidden = false;
    chapterTemplateToolbarActions.hidden = true;
    chapterCustomizerButton.setAttribute("aria-expanded", "false");
    hideChapterVariableMenu();
    setActiveChapter(currentChapter || chapterStates[0]);
    if (restoreFocus) chapterCustomizerButton.focus();
}

function applyChapterTemplate() {
    chapterTemplateDraft.templateContent = templateChapter.editor.getJSON();
    chapterTemplateSettings = normalizeChapterSettings(chapterTemplateDraft);
    applyChapterTemplateButton.disabled = true;
    showSaveState("Saving chapter templateâ€¦", "saving");

    chapterStates.forEach((chapter) => {
        chapter.settings = normalizeChapterSettings({
            ...chapter.settings,
            templateContent: chapterTemplateSettings.templateContent,
        });
        chapter.revision = nextRevision();
        writeBackup(chapter);
        scheduleChapterSave(chapter, 0);
    });

    applyChapterTemplateButton.disabled = false;
    closeChapterCustomizer({ restoreFocus: false });
    chapterCustomizerButton.focus();
}

function resetChapterTemplate() {
    chapterTemplateDraft = normalizeChapterSettings(DEFAULT_CHAPTER_SETTINGS);
    chapterTemplateDraft.templateContent = {
        type: "doc",
        content: [{ type: "paragraph" }],
    };
    templateChapter.settings = chapterTemplateDraft;
    applyChapterSettings(chapterTemplatePreview, chapterTemplateDraft);
    templateChapter.editor.commands.setContent(chapterTemplateDraft.templateContent);
    activeChapter = templateChapter;
    syncToolbar();
}

function syncSceneBreakControls(container, value) {
    const sceneBreak = normalizeSceneSeparator(value);
    const customInput = container.querySelector("[data-custom-scene-divider]");
    const customField = container.querySelector("[data-custom-divider-field]");
    const preview = container.querySelector("[data-scene-break-preview]");

    if (customInput && document.activeElement !== customInput) customInput.value = sceneBreak.custom;
    if (customField) customField.hidden = sceneBreak.preset !== "custom";
    container.querySelectorAll("[data-scene-divider-presets] button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === sceneBreak.preset);
        button.setAttribute("aria-pressed", String(button.dataset.value === sceneBreak.preset));
    });
    if (preview) {
        preview.dataset.scenePreset = sceneBreak.preset;
        preview.dataset.sceneSymbol = sceneSeparatorSymbol({ sceneSeparator: sceneBreak });
        preview.style.setProperty("--scene-break-color", sceneBreak.color);
        preview.style.setProperty("--scene-break-thickness", `${sceneBreak.thickness}px`);
        preview.style.setProperty(
            "--scene-break-double-stop",
            `${sceneBreak.thickness * 2}px`,
        );
        preview.style.setProperty(
            "--scene-break-double-height",
            `${sceneBreak.thickness * 3}px`,
        );
        preview.style.setProperty(
            "--scene-break-wave-height",
            `${8 + (sceneBreak.thickness * 2)}px`,
        );
    }
    return sceneBreak;
}

function closeSceneBreakPopover({ restoreEditorFocus = false } = {}) {
    if (sceneBreakPopover.hidden) return;
    const chapter = activeSceneBreak?.chapter;
    sceneBreakPopover.hidden = true;
    activeSceneBreak = null;
    if (restoreEditorFocus) chapter?.editor.commands.focus();
}

function positionSceneBreakPopover(clientX, clientY) {
    const rect = sceneBreakPopover.getBoundingClientRect();
    sceneBreakPopover.style.left = `${Math.max(10, Math.min(clientX, window.innerWidth - rect.width - 10))}px`;
    sceneBreakPopover.style.top = `${Math.max(10, Math.min(clientY, window.innerHeight - rect.height - 10))}px`;
}

function openSceneBreakPopover(chapter, position, clientX, clientY) {
    const node = chapter.editor.state.doc.nodeAt(position);
    if (node?.type.name !== "horizontalRule") return;
    activeSceneBreak = { chapter, position };
    chapter.editor.view.dispatch(
        chapter.editor.state.tr.setSelection(NodeSelection.create(chapter.editor.state.doc, position))
    );
    if (chapter === templateChapter) {
        activeChapter = chapter;
        syncToolbar();
    } else {
        setActiveChapter(chapter);
    }
    const configuredCustom = sceneBreakAttributes(
        sceneBreakSettingsForEditor(chapter.editor),
    ).custom;
    const customPresetButton = sceneBreakPopover.querySelector("[data-custom-scene-preset]");
    customPresetButton.textContent = configuredCustom;
    customPresetButton.setAttribute("aria-label", `Use custom divider ${configuredCustom}`);
    syncSceneBreakControls(sceneBreakPopover, node.attrs);
    sceneBreakPopover.hidden = false;
    positionSceneBreakPopover(clientX, clientY);
}

function updateActiveSceneBreak(patch) {
    if (!activeSceneBreak) return;
    const { chapter, position } = activeSceneBreak;
    const node = chapter.editor.state.doc.nodeAt(position);
    if (node?.type.name !== "horizontalRule") {
        closeSceneBreakPopover();
        return;
    }
    const attributes = normalizeSceneSeparator({ ...node.attrs, ...patch });
    chapter.editor.view.dispatch(
        chapter.editor.state.tr.setNodeMarkup(position, undefined, attributes)
    );
    syncSceneBreakControls(sceneBreakPopover, attributes);
}

function insertSceneBreak() {
    const editor = activeChapter?.editor;
    if (!editor) return;
    closeSceneBreakPopover();
    const attributes = sceneBreakAttributes(sceneBreakSettingsForEditor(editor));
    editor.chain().focus().insertContent([
        { type: "horizontalRule", attrs: attributes },
        { type: "paragraph" },
    ]).scrollIntoView().run();
}

function syncChapterSettingsDialog() {
    chapterSettingsDraft = normalizeChapterSettings(chapterSettingsDraft);
    const { opening, sceneSeparator } = chapterSettingsDraft;
    const openingEnabled = opening.mode !== "none";

    openingEnabledControl.checked = openingEnabled;
    syncSceneBreakControls(chapterSettingsDialog, sceneSeparator);

    chapterSettingsDialog.querySelectorAll("[data-opening-controls]").forEach((group) => {
        group.classList.toggle("is-disabled", !openingEnabled);
        group.querySelectorAll("button, input, select").forEach((control) => {
            control.disabled = !openingEnabled;
        });
    });
    chapterSettingsDialog.querySelectorAll("[data-opening-mode] button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === opening.mode);
    });
    chapterOpeningLayoutControl.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === opening.layout);
    });
}

function openChapterSettings() {
    if (chapterCustomizerOpen) closeChapterCustomizer({ restoreFocus: false });
    chapterSettingsDraft = normalizeChapterSettings(chapterTemplateSettings);
    chapterSettingsPreviousFocus = document.activeElement;
    chapterSettingsOpen = true;
    chapterSettingsBackdrop.hidden = false;
    chapterSettingsDialog.hidden = false;
    chapterSettingsButton.setAttribute("aria-expanded", "true");
    closeGrammarPopover();
    closeSelectionPopover();
    closeFontSizeMenu();
    syncChapterSettingsDialog();
    closeChapterSettingsButton.focus();
}

function closeChapterSettings({ restoreFocus = true } = {}) {
    if (!chapterSettingsOpen) return;
    chapterSettingsOpen = false;
    chapterSettingsBackdrop.hidden = true;
    chapterSettingsDialog.hidden = true;
    chapterSettingsButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) (chapterSettingsPreviousFocus || chapterSettingsButton).focus();
    chapterSettingsPreviousFocus = null;
}

function saveChapterSettings() {
    const savedSettings = normalizeChapterSettings(chapterSettingsDraft);
    chapterTemplateSettings = normalizeChapterSettings({
        ...chapterTemplateSettings,
        opening: savedSettings.opening,
        sceneSeparator: savedSettings.sceneSeparator,
    });
    saveChapterSettingsButton.disabled = true;
    showSaveState("Saving chapter settings…", "saving");

    chapterFontFamilies(chapterTemplateSettings).forEach((family) => {
        if (!isBuiltInFont(family)) registerImportedFont(family);
    });
    chapterStates.forEach((chapter) => {
        chapter.settings = normalizeChapterSettings({
            ...chapter.settings,
            opening: chapterTemplateSettings.opening,
            sceneSeparator: chapterTemplateSettings.sceneSeparator,
        });
        applyChapterSettings(chapter.article, chapter.settings);
        chapter.editor.view.dispatch(
            chapter.editor.state.tr.setMeta("chapterSettingsChanged", true)
        );
        chapter.revision = nextRevision();
        writeBackup(chapter);
        scheduleChapterSave(chapter, 0);
    });

    saveChapterSettingsButton.disabled = false;
    closeChapterSettings({ restoreFocus: false });
    chapterSettingsButton.focus();
}

function insertChapterVariable() {
    if (chapterVariableTarget?.kind === "input") {
        const { input, chapter } = chapterVariableTarget;
        const insertion = insertChapterNumberVariable(input.value, input.selectionStart);
        if (!insertion) return;
        input.value = insertion.value;
        if (chapter) {
            chapter.settings.numberLabel = insertion.value;
            chapter.revision = nextRevision();
            writeBackup(chapter);
            scheduleChapterSave(chapter);
        } else {
            chapterTemplateDraft.templateNumberLabel = insertion.value;
        }
        hideChapterVariableMenu();
        input.focus();
        input.setSelectionRange(insertion.cursor, insertion.cursor);
        return;
    }

    if (chapterVariableTarget?.kind === "editor" && chapterVariableEditorRange) {
        const { from, to } = chapterVariableEditorRange;
        hideChapterVariableMenu();
        templateChapter.editor.chain().focus().insertContentAt(
            { from, to },
            "@chapter_number",
        ).run();
    }
}

function activeBlockStyleKey(editor) {
    return editor?.isActive("heading")
        ? styleKeyForAttributes(editor.getAttributes("heading"))
        : "normal";
}

function activeReusableStyleKey(chapter = activeChapter) {
    const editor = chapter?.editor;
    if (!editor) return "normal";
    const { from, to } = editor.state.selection;
    return selectionUsesOpeningStyle(chapter, from, to)
        ? "opening"
        : activeBlockStyleKey(editor);
}

function reusableStyleSettings(chapter, styleKey) {
    if (!chapter) return null;
    return styleKey === "opening"
        ? chapter.settings.opening
        : chapter.settings.styles[styleKey];
}

function selectionHasExplicitFormatting(editor) {
    const textStyle = editor?.getAttributes("textStyle") || {};
    return Object.keys(textStyle).some((key) => textStyle[key] != null && textStyle[key] !== "")
        || ["bold", "italic", "underline"].some((mark) => editor?.isActive(mark));
}

function prepareOpeningStyleOverride(editor) {
    if (
        !editor
        || editor.state.selection.empty
        || activeReusableStyleKey(activeChapter) !== "opening"
        || selectionHasExplicitFormatting(editor)
    ) return;

    const style = activeChapter.settings.opening;
    let chain = editor.chain().focus()
        .setFontFamily(style.fontFamily)
        .setFontSize(`${style.fontSize}px`)
        .setColor(style.color);
    chain = style.bold ? chain.setBold() : chain.unsetBold();
    chain = style.italic ? chain.setItalic() : chain.unsetItalic();
    chain = style.underline ? chain.setUnderline() : chain.unsetUnderline();
    chain.run();
}

function rememberColorFormattingSelection(control) {
    const editor = activeChapter?.editor;
    const selection = editor?.state.selection;
    activeColorFormattingSelection = editor && selection && !selection.empty
        ? { control, editor, from: selection.from, to: selection.to }
        : null;
}

function restoreColorFormattingSelection(control) {
    const saved = activeColorFormattingSelection;
    const editor = saved?.control === control ? saved.editor : activeChapter?.editor;
    if (!editor || editor.isDestroyed) return null;
    if (
        saved
        && saved.editor === editor
        && saved.from >= 0
        && saved.to <= editor.state.doc.content.size
        && (editor.state.selection.from !== saved.from || editor.state.selection.to !== saved.to)
    ) {
        editor.view.dispatch(editor.state.tr.setSelection(
            TextSelection.create(editor.state.doc, saved.from, saved.to),
        ));
    }
    return editor;
}

[
    [fontColorControl, fontColorTrigger],
    [highlightColorControl, highlightColorTrigger],
].forEach(([control, trigger]) => {
    const wrapper = trigger.closest("[data-color-picker]");
    wrapper.addEventListener("color-picker-open", () => rememberColorFormattingSelection(control));
    wrapper.addEventListener("color-picker-close", () => {
        if (activeColorFormattingSelection?.control === control) {
            activeColorFormattingSelection = null;
        }
    });
});

function activeBlockNodeName(editor) {
    return editor?.isActive("heading") ? "heading" : "paragraph";
}

function syncAlignmentIcon(alignment) {
    const iconClasses = {
        left: "fa-align-left",
        center: "fa-align-center",
        right: "fa-align-right",
        justify: "fa-align-justify",
    };
    Object.values(iconClasses).forEach((className) => alignmentIcon.classList.remove(className));
    alignmentIcon.classList.add(iconClasses[alignment] || iconClasses.left);
}

function resolvedFontSize(textStyle, reusableStyle) {
    return normalizeFontSize(textStyle?.fontSize, reusableStyle?.fontSize || 12);
}

function selectedSceneBreak(editor = activeChapter?.editor) {
    const selection = editor?.state.selection;
    if (!(selection instanceof NodeSelection) || selection.node.type.name !== "horizontalRule") {
        return null;
    }
    return {
        attributes: normalizeSceneSeparator(selection.node.attrs),
        node: selection.node,
        position: selection.from,
    };
}

function updateSelectedSceneBreak(editor, patch) {
    const selected = selectedSceneBreak(editor);
    if (!selected) return false;
    const attributes = normalizeSceneSeparator({ ...selected.attributes, ...patch });
    editor.view.dispatch(
        editor.state.tr.setNodeMarkup(selected.position, undefined, attributes).scrollIntoView()
    );
    return true;
}

function currentEditorFontSize() {
    const editor = activeChapter?.editor;
    if (!editor) return 12;
    const sceneBreak = selectedSceneBreak(editor);
    if (sceneBreak) return sceneBreak.attributes.thickness;
    const styleKey = activeReusableStyleKey(activeChapter);
    return resolvedFontSize(
        editor.getAttributes("textStyle") || {},
        reusableStyleSettings(activeChapter, styleKey)
    );
}

function positionFontSizeMenu() {
    if (!fontSizeMenu || fontSizeMenu.hidden) return;
    const rect = fontSizeInput.getBoundingClientRect();
    const gap = 6;
    const availableBelow = window.innerHeight - rect.bottom - gap - 12;
    const availableAbove = rect.top - gap - 12;
    const openAbove = availableBelow < 190 && availableAbove > availableBelow;
    const maximumHeight = Math.max(120, Math.min(300, openAbove ? availableAbove : availableBelow));
    const width = 74;

    const left = Math.max(
        8,
        Math.min(rect.left + (rect.width - width) / 2, window.innerWidth - width - 8)
    );
    fontSizeMenu.style.left = `${left}px`;
    fontSizeMenu.style.width = `${width}px`;
    fontSizeMenu.style.maxHeight = `${maximumHeight}px`;
    fontSizeMenu.style.top = openAbove ? "auto" : `${rect.bottom + gap}px`;
    fontSizeMenu.style.bottom = openAbove ? `${window.innerHeight - rect.top + gap}px` : "auto";
}

function syncFontSizeOptions() {
    if (!fontSizeMenu) return;
    const currentSize = parseFontSize(fontSizeInput.value);
    fontSizeMenu.querySelectorAll("[data-font-size-option]").forEach((option) => {
        const isSelected = Number(option.dataset.fontSizeOption) === currentSize;
        option.setAttribute("aria-selected", String(isSelected));
    });
}

function closeFontSizeMenu({ restoreFocus = false } = {}) {
    if (!fontSizeMenu || fontSizeMenu.hidden) return;
    fontSizeMenu.hidden = true;
    fontSizeInput.setAttribute("aria-expanded", "false");
    fontSizePicker.classList.remove("is-open");
    if (restoreFocus) fontSizeInput.focus();
}

function applyFontSize(value, { focusEditor = true } = {}) {
    const editor = activeChapter?.editor;
    if (!editor) return;
    const sceneBreak = selectedSceneBreak(editor);
    if (sceneBreak) {
        const thickness = Math.min(8, Math.max(1, normalizeFontSize(
            value,
            sceneBreak.attributes.thickness,
        )));
        updateSelectedSceneBreak(editor, { thickness });
        fontSizeInput.value = formatFontSize(thickness);
        syncFontSizeOptions();
        return;
    }
    prepareOpeningStyleOverride(editor);
    const size = normalizeFontSize(value, currentEditorFontSize());
    fontSizeInput.value = formatFontSize(size);
    if (focusEditor) {
        editor.chain().focus().setFontSize(`${size}px`).run();
    } else {
        editor.commands.setFontSize(`${size}px`);
    }
    syncFontSizeOptions();
}

function ensureFontSizeMenu() {
    if (!fontSizeMenu) {
        fontSizeMenu = document.createElement("div");
        fontSizeMenu.id = "font-size-menu";
        fontSizeMenu.className = "custom-select-menu font-size-menu";
        fontSizeMenu.setAttribute("role", "listbox");
        fontSizeMenu.hidden = true;
        fontSizeMenu.addEventListener("pointerdown", (event) => event.stopPropagation());
        fontSizeMenu.addEventListener("keydown", (event) => {
            const options = [...fontSizeMenu.querySelectorAll("[data-font-size-option]")];
            const currentIndex = options.indexOf(document.activeElement);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const direction = event.key === "ArrowDown" ? 1 : -1;
                const startIndex = currentIndex >= 0 ? currentIndex : 0;
                options[(startIndex + direction + options.length) % options.length]?.focus();
            } else if (event.key === "Escape") {
                event.preventDefault();
                closeFontSizeMenu({ restoreFocus: true });
            }
        });
        document.body.append(fontSizeMenu);
    }

    const nextMode = selectedSceneBreak() ? "scene-break" : "text";
    if (fontSizeMenuMode === nextMode) return fontSizeMenu;
    fontSizeMenuMode = nextMode;
    fontSizeMenu.replaceChildren();
    fontSizeMenu.setAttribute(
        "aria-label",
        nextMode === "scene-break" ? "Scene break thickness presets" : "Font size presets",
    );
    const sizes = nextMode === "scene-break" ? [1, 2, 3, 4, 5, 6, 7, 8] : FONT_SIZE_PRESETS;
    sizes.forEach((size) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "custom-select-option font-size-option";
        option.setAttribute("role", "option");
        option.dataset.fontSizeOption = String(size);
        option.textContent = String(size);
        option.addEventListener("click", () => {
            applyFontSize(size);
            closeFontSizeMenu();
        });
        fontSizeMenu.append(option);
    });
    return fontSizeMenu;
}

function openFontSizeMenu() {
    if (fontSizeInput.disabled) return;
    ensureFontSizeMenu().hidden = false;
    fontSizeInput.setAttribute("aria-expanded", "true");
    fontSizePicker.classList.add("is-open");
    syncFontSizeOptions();
    positionFontSizeMenu();
    const selectedOption = fontSizeMenu.querySelector('[aria-selected="true"]');
    if (selectedOption) {
        fontSizeMenu.scrollTop = Math.max(
            0,
            selectedOption.offsetTop - (fontSizeMenu.clientHeight - selectedOption.offsetHeight) / 2
        );
    }
}

function syncToolbar() {
    syncBlockStylePreviews(chapterTemplateSettings);
    const editor = activeChapter?.editor;
    const sceneBreak = selectedSceneBreak(editor);
    const textStyle = editor?.getAttributes("textStyle") || {};
    const reusableStyleKey = editor ? activeReusableStyleKey(activeChapter) : "normal";
    const reusableStyle = reusableStyleSettings(activeChapter, reusableStyleKey);
    toolbarButtons.forEach((button) => {
        const config = commandMap[button.dataset.command];
        const isActive = INLINE_FORMATS[config?.active]
            ? effectiveFormattingState(editor, config.active)
            : Boolean(editor && config?.active && editor.isActive(config.active));
        const canUseHistory = editor && config?.history
            ? Boolean(editor.can()[config.command]?.())
            : true;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
        button.disabled = !editor || !canUseHistory || Boolean(sceneBreak && !config?.history);
    });

    [fontColorControl, fontSizeInput, decreaseFontSizeButton, increaseFontSizeButton]
        .forEach((control) => { control.disabled = !editor; });
    [fontFamilyControl, highlightColorControl, lineHeightControl, blockStyleControl, alignmentMenu]
        .forEach((control) => { control.disabled = !editor || Boolean(sceneBreak); });
    insertSceneBreakButton.disabled = !editor;
    alignmentMenu.disabled = !editor || Boolean(sceneBreak) || reusableStyleKey === "opening";
    lineHeightControl.disabled = !editor || Boolean(sceneBreak) || reusableStyleKey === "opening";

    const resolvedFontFamily = textStyle.fontFamily || reusableStyle?.fontFamily || "Playfair Display";
    const currentFontSize = sceneBreak
        ? sceneBreak.attributes.thickness
        : resolvedFontSize(textStyle, reusableStyle);
    const alignmentAttributes = editor?.getAttributes(activeBlockNodeName(editor)) || {};
    const resolvedAlignment = alignmentAttributes.textAlign || reusableStyle?.alignment || "left";
    fontFamilyControl.value = resolvedFontFamily;
    if (document.activeElement !== fontSizeInput) {
        fontSizeInput.value = formatFontSize(currentFontSize);
    }
    syncFontSizeOptions();
    alignmentMenu.value = resolvedAlignment;
    syncAlignmentIcon(resolvedAlignment);
    lineHeightControl.value = textStyle.lineHeight || "";
    setColorPickerValue(
        fontColorControl,
        sceneBreak?.attributes.color || textStyle.color || reusableStyle?.color || fontColorControl.value,
    );
    setColorPickerValue(highlightColorControl, textStyle.backgroundColor || highlightColorControl.value);
    fontSizeInput.setAttribute("aria-label", sceneBreak ? "Scene break thickness" : "Font size");
    decreaseFontSizeButton.setAttribute(
        "aria-label",
        sceneBreak ? "Decrease scene break thickness" : "Decrease font size",
    );
    decreaseFontSizeButton.title = titleWithShortcut(
        decreaseFontSizeButton.getAttribute("aria-label"),
        "fontSizeDecrease",
    );
    increaseFontSizeButton.setAttribute(
        "aria-label",
        sceneBreak ? "Increase scene break thickness" : "Increase font size",
    );
    increaseFontSizeButton.title = titleWithShortcut(
        increaseFontSizeButton.getAttribute("aria-label"),
        "fontSizeIncrease",
    );
    fontColorTrigger.setAttribute("aria-label", sceneBreak ? "Scene break color" : "Font color");
    fontColorTrigger.title = fontColorTrigger.getAttribute("aria-label");

    if (editor) {
        blockStyleControl.value = reusableStyleKey;
    }
    [fontFamilyControl, lineHeightControl, blockStyleControl, alignmentMenu]
        .forEach(refreshCustomSelect);
}

function setCurrentChapter(chapter) {
    currentChapter = chapter;
    chapterStates.forEach((candidate) => {
        const isCurrent = candidate === chapter;
        candidate.sidebarButton?.classList.toggle("is-current", isCurrent);
        if (isCurrent) {
            candidate.sidebarButton?.setAttribute("aria-current", "location");
        } else {
            candidate.sidebarButton?.removeAttribute("aria-current");
        }
    });
}

function setActiveChapter(chapter) {
    activeChapter = chapter;
    setCurrentChapter(chapter);
    syncToolbar();
    closeGrammarPopover();
    scheduleGrammarSidebarSync();
}

function syncChapterTitle(chapter) {
    const title = chapterTitle(chapter);
    const heading = chapter.article.querySelector(".tiptap h1");
    chapter.sidebarButton?.querySelector(".chapter-link-title")?.replaceChildren(title);

    if (heading) {
        heading.id = `chapter-${chapter.number}-heading`;
        chapter.article.setAttribute("aria-labelledby", heading.id);
        chapter.article.removeAttribute("aria-label");
    } else {
        chapter.article.removeAttribute("aria-labelledby");
        chapter.article.setAttribute("aria-label", `Chapter ${chapter.number}: ${title}`);
    }
}

function renderSidebar() {
    chapterNavigation.replaceChildren();

    chapterStates.forEach((chapter) => {
        const row = document.createElement("div");
        row.className = "chapter-link-row";
        const button = document.createElement("button");
        button.className = "chapter-link";
        button.type = "button";
        button.innerHTML = `
            <span class="chapter-link-number">${String(chapter.number).padStart(2, "0")}</span>
            <span class="chapter-link-title"></span>
        `;
        button.querySelector(".chapter-link-title").textContent = chapterTitle(chapter);
        button.addEventListener("click", () => {
            setCurrentChapter(chapter);
            const anchor = chapter.article.querySelector(".tiptap h1") || chapter.article;
            anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        const deleteButton = document.createElement("button");
        deleteButton.className = "chapter-link-delete";
        deleteButton.type = "button";
        deleteButton.title = `Delete chapter ${chapter.number}`;
        deleteButton.setAttribute("aria-label", `Delete chapter ${chapter.number}`);
        deleteButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        deleteButton.addEventListener("click", () => void deleteChapter(chapter));
        chapter.sidebarButton = button;
        row.append(button, deleteButton);
        chapterNavigation.append(row);
    });

    if (currentChapter) {
        setCurrentChapter(currentChapter);
    }
}

function clearMatchingBackup(chapter, savedJson, savedPath, savedRevision) {
    const backup = readBackup(chapter.number);
    const backupJson = backup && JSON.stringify({
        content: backup.content,
        settings: normalizeChapterSettings(backup.settings),
    });

    if (
        backup
        && backupJson === savedJson
        && backup.save_path === savedPath
        && backup.client_updated_at === savedRevision
    ) {
        removeBackup(chapter.number);
    }
}

async function saveChapter(chapter) {
    clearTimeout(chapter.saveTimeout);
    const content = chapter.editor.getJSON();
    const settings = chapter.settings;
    const json = JSON.stringify({ content, settings });
    const savePath = chapterPath(chapter);

    if (json === chapter.lastSaved && savePath === chapter.lastSavedPath) {
        return;
    }

    if (chapter.saveInFlight) {
        chapter.saveQueued = true;
        return chapter.saveInFlight;
    }

    const savedRevision = chapter.revision;
    chapter.saveStatus = "saving";
    syncOverallSaveState();

    const operation = (async () => {
        try {
            const response = await fetch(savePath, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, settings, client_updated_at: savedRevision }),
            });

            if (!response.ok) {
                throw new Error(`Chapter ${chapter.number} save failed with status ${response.status}`);
            }

            chapter.lastSaved = json;
            chapter.lastSavedPath = savePath;
            chapter.saveStatus = "saved";
            clearMatchingBackup(chapter, json, savePath, savedRevision);
        } catch (error) {
            chapter.saveStatus = "error";
            console.error(error);
        }
    })();

    chapter.saveInFlight = operation;

    try {
        await operation;
    } finally {
        chapter.saveInFlight = null;
        syncOverallSaveState();

        if (
            chapter.saveQueued
            || serializedChapter(chapter) !== json
            || chapterPath(chapter) !== savePath
        ) {
            chapter.saveQueued = false;
            void saveChapter(chapter);
        }
    }
}

function scheduleChapterSave(chapter, delay = AUTOSAVE_DELAY) {
    clearTimeout(chapter.saveTimeout);
    chapter.saveStatus = "saving";
    syncOverallSaveState();
    chapter.saveTimeout = setTimeout(() => void saveChapter(chapter), delay);
}

function blankChapterContent(chapterNumber, settings = chapterTemplateSettings) {
    const template = normalizeChapterSettings(settings);
    return chapterContentFromTemplate(template.templateContent, chapterNumber);
}

function updateChapterIdentity(chapter) {
    chapter.article.id = `chapter-${chapter.number}`;
    chapter.article.dataset.chapterNumber = String(chapter.number);
    chapter.addButton.setAttribute("aria-label", `Add a new chapter after chapter ${chapter.number}`);
    chapter.deleteButton.setAttribute("aria-label", `Delete chapter ${chapter.number}`);
    chapter.deleteButton.title = `Delete chapter ${chapter.number}`;
    syncChapterTitle(chapter);
}

function createChapterState(chapterDocument, { needsSync = false } = {}) {
    const article = window.document.createElement("article");
    article.className = "chapter-section";
    article.innerHTML = `
        <div class="chapter-editor" data-chapter-editor></div>
        <div class="chapter-end-marker">
            <span aria-hidden="true"></span>
            <div class="chapter-end-actions">
                <button class="add-chapter-button" type="button">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i> Add new chapter
                </button>
                <button class="delete-chapter-button" type="button">
                    <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete chapter
                </button>
            </div>
            <span aria-hidden="true"></span>
        </div>
    `;
    const hasDocumentSettings = chapterDocument.settings
        && typeof chapterDocument.settings === "object"
        && Object.keys(chapterDocument.settings).length > 0;
    const documentSettings = normalizeChapterSettings(chapterDocument.settings);
    const templateSettings = normalizeChapterSettings(chapterTemplateSettings);
    const chapterSettings = hasDocumentSettings
        ? documentSettings
        : normalizeChapterSettings({
            ...templateSettings,
            numberLabel: templateSettings.templateNumberLabel,
        });
    const shouldSync = needsSync || !hasDocumentSettings;
    const chapter = {
        number: chapterDocument.chapter_number,
        article,
        addButton: article.querySelector(".add-chapter-button"),
        deleteButton: article.querySelector(".delete-chapter-button"),
        editor: null,
        settings: chapterSettings,
        sidebarButton: null,
        revision: chapterDocument.client_updated_at || nextRevision(),
        lastSaved: shouldSync ? "" : JSON.stringify({
            content: chapterDocument.content,
            settings: chapterSettings,
        }),
        lastSavedPath: shouldSync ? "" : projectDocumentPath(currentProjectName, chapterDocument.chapter_number),
        saveTimeout: null,
        saveInFlight: null,
        saveQueued: false,
        saveStatus: shouldSync ? "saving" : "saved",
        reviewedGrammar: new Set(),
        grammarAllIssues: [],
        grammarIssues: [],
        grammarStatus: "ready",
        grammarLastChecked: Date.now(),
        grammarCheckTimeout: null,
    };
    revisionClock = Math.max(revisionClock, chapter.revision);
    chapterFontFamilies(chapter.settings).forEach((family) => {
        if (!isBuiltInFont(family)) registerImportedFont(family);
    });
    applyChapterSettings(article, chapter.settings);
    chapter.editor = new Editor({
        element: article.querySelector("[data-chapter-editor]"),
        editorProps: {
            attributes: {
                spellcheck: "false",
                autocorrect: "off",
                "data-gramm": "false",
                "data-gramm_editor": "false",
                "data-enable-grammarly": "false",
            },
        },
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                horizontalRule: false,
            }),
            TextStyleKit,
            inheritedFormattingOverrideExtension,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            googleDocsShortcutsExtension,
            indentExtension,
            sceneBreakExtension,
            openingTextExtension(chapter),
            findReplaceExtension(chapter),
            grammarExtension(chapter),
            Placeholder.configure({
                placeholder: ({ node }) => node.type.name === "heading"
                    ? "Untitled chapter"
                    : "Begin writing…",
            }),
        ],
        content: sceneBreakContentWithDefaults(chapterDocument.content, chapterSettings),
        onCreate: () => {
            syncChapterTitle(chapter);
            syncStats();
        },
        onFocus: () => setActiveChapter(chapter),
        onUpdate: () => {
            chapter.revision = nextRevision();
            writeBackup(chapter);
            syncChapterTitle(chapter);
            syncStats();
            syncToolbar();
            scheduleChapterSave(chapter);
            scheduleFindResultsSync();
        },
        onSelectionUpdate: () => {
            activeChapter = chapter;
            rememberWriterSelectionForFind(chapter);
            syncToolbar();
        },
    });
    chapter.addButton.addEventListener("click", () => void addChapterAfter(chapter));
    chapter.deleteButton.addEventListener("click", () => void deleteChapter(chapter));
    updateChapterIdentity(chapter);
    return chapter;
}

function mergedChapterDocuments(serverDocuments) {
    const documentsByNumber = new Map(
        serverDocuments.map((document) => [document.chapter_number, { document, needsSync: false }])
    );
    const chapterNumbers = new Set([...documentsByNumber.keys(), ...storedBackupNumbers()]);

    chapterNumbers.forEach((chapterNumber) => {
        const backup = readBackup(chapterNumber);
        const serverEntry = documentsByNumber.get(chapterNumber);
        const serverDocument = serverEntry?.document;
        const currentPath = projectDocumentPath(currentProjectName, chapterNumber);

        if (backup && (
            !serverDocument
            || backup.client_updated_at > serverDocument.client_updated_at
            || backup.save_path !== currentPath
        )) {
            documentsByNumber.set(chapterNumber, {
                document: {
                    chapter_number: chapterNumber,
                    content: backup.content,
                    settings: backup.settings,
                    client_updated_at: backup.client_updated_at,
                },
                needsSync: true,
            });
        } else if (backup) {
            removeBackup(chapterNumber);
        }
    });

    return [...documentsByNumber.values()].sort(
        (left, right) => left.document.chapter_number - right.document.chapter_number
    );
}

async function loadBook() {
    showSaveState("Loading chapters…", "saving");
    let serverDocuments = [];
    let serverLoaded = false;

    try {
        const response = await fetch(projectChaptersPath(currentProjectName), {
            headers: { "Accept": "application/json" },
        });

        if (!response.ok) {
            throw new Error(`Chapter list failed with status ${response.status}`);
        }

        serverDocuments = await response.json();
        serverLoaded = true;
    } catch (error) {
        console.error(error);
        showSaveState("Working from offline backup", "error");
    }

    const documents = mergedChapterDocuments(serverDocuments);

    if (documents.length === 0) {
        if (!serverLoaded) {
            chapterStack.innerHTML = `
                <div class="chapter-load-error">
                    <strong>We couldn’t open your chapters.</strong>
                    <p>Your manuscript has not been changed. Check your connection and try again.</p>
                    <button type="button">Try again</button>
                </div>
            `;
            chapterStack.querySelector("button").addEventListener("click", () => void loadBook());
            return;
        }

        documents.push({
            document: {
                chapter_number: 1,
                content: blankChapterContent(1),
                client_updated_at: nextRevision(),
            },
            needsSync: true,
        });
    }

    const savedTemplate = documents.find(({ document }) => (
        document.settings
        && typeof document.settings === "object"
        && Object.keys(document.settings).length > 0
    ));
    chapterTemplateSettings = normalizeChapterSettings(
        savedTemplate?.document.settings || DEFAULT_CHAPTER_SETTINGS
    );

    chapterStack.replaceChildren();
    documents.forEach(({ document, needsSync }) => {
        const chapter = createChapterState(document, { needsSync });
        chapterStates.push(chapter);
        chapterStack.append(chapter.article);
    });
    renderSidebar();
    setActiveChapter(chapterStates[0]);
    syncStats();

    chapterStates.filter((chapter) => chapter.saveStatus === "saving").forEach(
        (chapter) => scheduleChapterSave(chapter, 0)
    );
    syncOverallSaveState();
}

function migrateRenumberedBackup(chapter, oldNumber) {
    const oldBackup = readBackup(oldNumber);
    removeBackup(oldNumber);

    if (oldBackup) {
        writeBackup(chapter);
    }
}

function setChapterMutationDisabled(disabled) {
    document.querySelectorAll(
        ".add-chapter-button, .delete-chapter-button, .chapter-link-delete"
    ).forEach((button) => {
        button.disabled = disabled;
    });
}

async function addChapterAfter(afterChapter) {
    if (addChapterInProgress) {
        return;
    }

    addChapterInProgress = true;
    setChapterMutationDisabled(true);
    showSaveState("Adding chapter…", "saving");

    try {
        await Promise.all(chapterStates.map((chapter) => saveChapter(chapter)));
        const response = await fetch(projectChaptersPath(currentProjectName), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                after_chapter: afterChapter.number,
                client_updated_at: nextRevision(),
            }),
        });

        if (!response.ok) {
            throw new Error(`Add chapter failed with status ${response.status}`);
        }

        const createdDocument = await response.json();
        createdDocument.content = blankChapterContent(
            createdDocument.chapter_number,
            chapterTemplateSettings,
        );
        createdDocument.settings = normalizeChapterSettings({
            ...chapterTemplateSettings,
            numberLabel: chapterTemplateSettings.templateNumberLabel,
        });
        [...chapterStates].reverse().forEach((chapter) => {
            if (chapter.number > afterChapter.number) {
                const oldNumber = chapter.number;
                chapter.number += 1;
                chapter.lastSavedPath = chapterPath(chapter);
                migrateRenumberedBackup(chapter, oldNumber);
                updateChapterIdentity(chapter);
            }
        });
        const newChapter = createChapterState(createdDocument, { needsSync: true });
        const insertionIndex = chapterStates.indexOf(afterChapter) + 1;
        chapterStates.splice(insertionIndex, 0, newChapter);
        afterChapter.article.after(newChapter.article);
        renderSidebar();
        setActiveChapter(newChapter);
        syncStats();
        scheduleChapterSave(newChapter, 0);
        newChapter.article.scrollIntoView({ behavior: "smooth", block: "start" });
        newChapter.editor.commands.focus("end");
    } catch (error) {
        console.error(error);
        showSaveState("Could not add chapter", "error");
    } finally {
        addChapterInProgress = false;
        setChapterMutationDisabled(false);
    }
}

async function deleteChapter(chapterToDelete) {
    if (addChapterInProgress) {
        return;
    }

    const title = chapterTitle(chapterToDelete);
    const confirmed = window.confirm(
        `Delete “${title}”? This permanently removes this chapter and its saved content.`
    );

    if (!confirmed) {
        return;
    }

    addChapterInProgress = true;
    setChapterMutationDisabled(true);
    showSaveState(`Deleting chapter ${chapterToDelete.number}…`, "saving");

    try {
        await Promise.all(chapterStates.map((chapter) => saveChapter(chapter)));
        const deletedNumber = chapterToDelete.number;
        const deletedIndex = chapterStates.indexOf(chapterToDelete);
        const response = await fetch(chapterPath(chapterToDelete), { method: "DELETE" });

        if (!response.ok) {
            throw new Error(`Delete chapter failed with status ${response.status}`);
        }

        clearTimeout(chapterToDelete.grammarCheckTimeout);
        chapterToDelete.editor.destroy();
        chapterToDelete.article.remove();
        chapterStates.splice(deletedIndex, 1);
        removeBackup(deletedNumber);

        chapterStates.forEach((chapter) => {
            if (chapter.number > deletedNumber) {
                const oldNumber = chapter.number;
                chapter.number -= 1;
                chapter.lastSavedPath = chapterPath(chapter);
                migrateRenumberedBackup(chapter, oldNumber);
                updateChapterIdentity(chapter);
            }
        });

        if (chapterStates.length === 0) {
            const firstChapter = createChapterState({
                chapter_number: 1,
                content: blankChapterContent(1),
                client_updated_at: nextRevision(),
            }, { needsSync: true });
            chapterStates.push(firstChapter);
            chapterStack.append(firstChapter.article);
            scheduleChapterSave(firstChapter, 0);
        }

        renderSidebar();
        const nextChapter = chapterStates[Math.min(deletedIndex, chapterStates.length - 1)];
        setActiveChapter(nextChapter);
        syncStats();
        syncOverallSaveState();
        nextChapter.article.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        console.error(error);
        showSaveState("Could not delete chapter", "error");
    } finally {
        addChapterInProgress = false;
        setChapterMutationDisabled(false);
    }
}

function updateChapterFromScroll() {
    scrollFrame = null;
    const scrollTop = bookScroll.getBoundingClientRect().top;
    let closestChapter = chapterStates[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    chapterStates.forEach((chapter) => {
        const distance = Math.abs(chapter.article.getBoundingClientRect().top - scrollTop - 24);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestChapter = chapter;
        }
    });

    if (closestChapter && closestChapter !== currentChapter) {
        setCurrentChapter(closestChapter);
    }
}

function selectFontForTarget(family) {
    registerImportedFont(family);
    if (!fontLibraryTarget) return;
    fontLibraryTarget.value = family;
    refreshCustomSelect(fontLibraryTarget);
    fontLibraryTarget.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderFontCatalog() {
    if (!googleFontCatalog) return;
    clearGoogleFontPreviews();
    const visibleFonts = filterFontCatalog(googleFontCatalog, fontSearch.value, 48);
    loadGoogleFontPreviews(visibleFonts.map((font) => font.family));
    fontResults.replaceChildren();
    fontLibraryStatus.textContent = `${visibleFonts.length} shown · ${googleFontCatalog.length.toLocaleString()} available`;

    if (!visibleFonts.length) {
        const empty = document.createElement("div");
        empty.className = "font-library-empty";
        empty.innerHTML = `
            <i class="fa-solid fa-font" aria-hidden="true"></i>
            <strong>No matching typefaces</strong>
            <span>Try a shorter name or different spelling.</span>
        `;
        fontResults.append(empty);
        return;
    }

    visibleFonts.forEach((font) => {
        const row = document.createElement("article");
        row.className = "font-result";
        const copy = document.createElement("div");
        copy.className = "font-result-copy";
        const name = document.createElement("span");
        name.className = "font-result-name";
        name.textContent = font.family;
        name.style.fontFamily = `"${font.family}", serif`;
        const meta = document.createElement("span");
        meta.className = "font-result-meta";
        meta.textContent = `${font.category} · ${font.subsets.includes("latin") ? "Latin" : font.subsets[0] || "Multi-script"}`;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = importedFonts.includes(font.family) ? "Use" : "Add font";
        button.addEventListener("click", () => {
            selectFontForTarget(font.family);
            closeFontLibrary();
        });
        copy.append(name, meta);
        row.append(copy, button);
        fontResults.append(row);
    });
}

async function loadGoogleFontCatalog() {
    if (googleFontCatalog) return googleFontCatalog;
    if (!googleFontCatalogPromise) {
        googleFontCatalogPromise = fetch("/api/fonts/google", {
            headers: { "Accept": "application/json" },
        }).then(async (response) => {
            if (!response.ok) throw new Error(`Font catalog failed with status ${response.status}`);
            return response.json();
        }).then((fonts) => {
            googleFontCatalog = fonts;
            return fonts;
        }).finally(() => {
            googleFontCatalogPromise = null;
        });
    }
    return googleFontCatalogPromise;
}

async function openFontLibrary(trigger, targetSelect) {
    fontLibraryTarget = targetSelect;
    fontLibraryTrigger = trigger;
    fontLibrary.hidden = false;
    fontLibraryBackdrop.hidden = false;
    fontSearch.value = "";
    fontResults.innerHTML = '<div class="font-library-empty"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><strong>Loading Google Fonts…</strong></div>';
    fontLibraryStatus.textContent = "Loading font catalog…";
    fontSearch.focus();

    try {
        await loadGoogleFontCatalog();
        if (!fontLibrary.hidden) renderFontCatalog();
    } catch (error) {
        console.error(error);
        fontLibraryStatus.textContent = "Catalog unavailable";
        fontResults.innerHTML = `
            <div class="font-library-empty">
                <i class="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i>
                <strong>Couldn’t reach Google Fonts</strong>
                <span>Check your connection and try again.</span>
            </div>
        `;
    }
}

function closeFontLibrary() {
    if (fontLibrary.hidden) return;
    fontLibrary.hidden = true;
    fontLibraryBackdrop.hidden = true;
    clearTimeout(fontSearchTimer);
    clearGoogleFontPreviews();
    fontLibraryTarget = null;
    fontLibraryTrigger?.focus();
    fontLibraryTrigger = null;
}

findInput.addEventListener("input", () => {
    findState.query = findInput.value;
    syncFindResults({ resetCurrent: true });
});
findPreviousButton.addEventListener("click", () => navigateFind(-1));
findNextButton.addEventListener("click", () => navigateFind(1));
closeFindButton.addEventListener("click", () => closeFindReplace());
replaceOneButton.addEventListener("click", replaceCurrentFindMatch);
replaceAllButton.addEventListener("click", replaceAllFindMatches);
findCaseSensitiveButton.addEventListener("click", () => {
    findState.caseSensitive = !findState.caseSensitive;
    findCaseSensitiveButton.setAttribute("aria-pressed", String(findState.caseSensitive));
    syncFindResults({ resetCurrent: true });
});
findWholeWordButton.addEventListener("click", () => {
    findState.wholeWord = !findState.wholeWord;
    findWholeWordButton.setAttribute("aria-pressed", String(findState.wholeWord));
    syncFindResults({ resetCurrent: true });
});
findScopeControl.addEventListener("change", () => {
    findState.scope = findScopeControl.value;
    if (findState.scope === "chapter") {
        findState.scopeChapter = currentChapter || findState.savedChapter || chapterStates[0];
    }
    syncFindResults({ resetCurrent: true });
});
document.addEventListener("keydown", (event) => {
    const findShortcut = (event.ctrlKey || event.metaKey)
        && !event.altKey
        && event.key.toLocaleLowerCase() === "f";
    if (findShortcut && !statusBar.hidden && !chapterCustomizerOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openFindReplace();
        return;
    }
    if (!findState.open) return;
    if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeFindReplace();
        return;
    }
    if (
        event.key === "Enter"
        && (event.target === findInput || event.target === replaceInput)
    ) {
        event.preventDefault();
        event.stopPropagation();
        navigateFind(event.shiftKey ? -1 : 1);
    }
}, { capture: true });

syncProjectName();
startRenameButtons.forEach((button) => button.addEventListener("click", startRenamingProject));
cancelRenameButton.addEventListener("click", cancelRenamingProject);
openDictionaryButton.addEventListener("click", openDictionaryPanel);
closeDictionaryButton.addEventListener("click", closeDictionaryPanel);
dictionaryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void lookupDictionaryWord();
});
dictionaryExampleButtons.forEach((button) => button.addEventListener("click", () => {
    dictionaryInput.value = button.dataset.dictionaryExample;
    void lookupDictionaryWord();
}));
openGrammarButton.addEventListener("click", () => openGrammarPanel());
closeGrammarButton.addEventListener("click", closeGrammarPanel);
grammarPopover.addEventListener("pointerenter", () => {
    clearTimeout(grammarPopoverCloseTimeout);
    grammarPopoverCloseTimeout = null;
});
grammarPopover.addEventListener("pointerleave", scheduleGrammarPopoverClose);
grammarCheckNowButton.addEventListener("click", () => {
    if (activeChapter) scheduleGrammarCheck(activeChapter, 180);
});
grammarAcceptButton.addEventListener("click", () => {
    if (activeGrammarIssue) {
        reviewGrammarIssue(activeGrammarIssue.chapter, activeGrammarIssue.issue, "accept");
    }
});
grammarDismissButton.addEventListener("click", () => {
    if (activeGrammarIssue) {
        reviewGrammarIssue(activeGrammarIssue.chapter, activeGrammarIssue.issue, "dismiss");
    }
});
selectionDefineButton.addEventListener("click", defineSelectedWord);
selectionSynonymsButton.addEventListener("click", () => void showDictionarySynonyms());
selectionUpdateStyleButton.addEventListener("click", updateReusableStyleFromSelection);
closeSynonymsButton.addEventListener("click", showSelectionActions);
document.addEventListener("contextmenu", (event) => {
    const editorElement = event.target.closest?.(".tiptap");
    const article = editorElement?.closest(".chapter-section");
    const chapter = chapterStates.find((candidate) => candidate.article === article);
    const selection = window.getSelection();
    if (!chapter || !selection || selection.isCollapsed || !selection.rangeCount) {
        if (!selectionPopover.hidden) closeSelectionPopover();
        return;
    }
    const range = selection.getRangeAt(0);
    const rangeContainer = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    if (!rangeContainer || !editorElement.contains(rangeContainer)) return;

    let from;
    let to;
    try {
        from = chapter.editor.view.posAtDOM(range.startContainer, range.startOffset);
        to = chapter.editor.view.posAtDOM(range.endContainer, range.endOffset);
    } catch {
        return;
    }
    if (from > to) [from, to] = [to, from];
    const rawText = selection.toString();
    const leadingWhitespace = rawText.length - rawText.trimStart().length;
    const trailingWhitespace = rawText.length - rawText.trimEnd().length;
    from += leadingWhitespace;
    to -= trailingWhitespace;
    const text = rawText.trim();
    if (!text || from >= to) return;

    event.preventDefault();
    closeGrammarPopover();
    openSelectionPopover({ chapter, from, to, text, clientX: event.clientX, clientY: event.clientY });
});
document.addEventListener("pointerover", (event) => {
    const highlight = event.target.closest?.("[data-grammar-issue]");
    if (!highlight || highlight.contains(event.relatedTarget)) return;
    const article = highlight.closest(".chapter-section");
    const chapter = chapterStates.find((candidate) => candidate.article === article);
    const issue = chapter?.grammarIssues.find(
        (candidate) => candidate.id === highlight.dataset.grammarIssue,
    );
    if (chapter && issue) openGrammarPopover(chapter, issue, highlight);
});
document.addEventListener("pointerout", (event) => {
    const highlight = event.target.closest?.("[data-grammar-issue]");
    if (!highlight || highlight.contains(event.relatedTarget)) return;
    if (grammarPopover.contains(event.relatedTarget)) return;
    scheduleGrammarPopoverClose();
});
document.addEventListener("keydown", (event) => {
    const highlight = event.target.closest?.("[data-grammar-issue]");
    if (!highlight || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    const article = highlight.closest(".chapter-section");
    const chapter = chapterStates.find((candidate) => candidate.article === article);
    const issue = chapter?.grammarIssues.find(
        (candidate) => candidate.id === highlight.dataset.grammarIssue,
    );
    if (chapter && issue) openGrammarPopover(chapter, issue, highlight);
});
projectNameInput.addEventListener("input", () => projectNameInput.setCustomValidity(""));
projectNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        event.preventDefault();
        cancelRenamingProject();
    }
});
projectRenameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const requestedName = projectNameInput.value;
    const resolvedName = nextAvailableProjectName(requestedName, projectNames, projectId);

    if (!resolvedName) {
        projectNameInput.setCustomValidity("Enter a project name.");
        projectNameInput.reportValidity();
        return;
    }

    projectNameInput.setCustomValidity("");
    currentProjectName = resolvedName;
    projectNames[projectId] = resolvedName;
    saveProjectNames(projectNames);
    syncProjectName();
    cancelRenamingProject();
    chapterStates.forEach((chapter) => {
        chapter.revision = nextRevision();
        writeBackup(chapter);
        chapter.lastSavedPath = "";
        scheduleChapterSave(chapter, 0);
    });
});

chapterCustomizerButton.addEventListener("click", openChapterCustomizer);
closeChapterCustomizerButton.addEventListener("click", () => closeChapterCustomizer());
applyChapterTemplateButton.addEventListener("click", applyChapterTemplate);
resetChapterTemplateButton.addEventListener("click", resetChapterTemplate);
chapterSettingsButton.addEventListener("click", openChapterSettings);
closeChapterSettingsButton.addEventListener("click", () => closeChapterSettings());
cancelChapterSettingsButton.addEventListener("click", () => closeChapterSettings());
chapterSettingsBackdrop.addEventListener("click", () => closeChapterSettings());
saveChapterSettingsButton.addEventListener("click", saveChapterSettings);
insertSceneBreakButton.addEventListener("click", insertSceneBreak);

openingEnabledControl.addEventListener("change", () => {
    if (openingEnabledControl.checked) {
        chapterSettingsDraft.opening.mode = openingEnabledControl.dataset.previousMode || "character";
    } else {
        openingEnabledControl.dataset.previousMode = chapterSettingsDraft.opening.mode === "none"
            ? "character"
            : chapterSettingsDraft.opening.mode;
        chapterSettingsDraft.opening.mode = "none";
    }
    syncChapterSettingsDialog();
});
chapterSettingsDialog.querySelectorAll("[data-opening-mode] button").forEach((button) => {
    button.addEventListener("click", () => {
        chapterSettingsDraft.opening.mode = button.dataset.value;
        openingEnabledControl.dataset.previousMode = button.dataset.value;
        syncChapterSettingsDialog();
    });
});
chapterOpeningLayoutControl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
        chapterSettingsDraft.opening.layout = button.dataset.value;
        syncChapterSettingsDialog();
    });
});
chapterSettingsDialog.querySelectorAll("[data-scene-divider-presets] button").forEach((button) => {
    button.addEventListener("click", () => {
        chapterSettingsDraft.sceneSeparator.preset = button.dataset.value;
        syncChapterSettingsDialog();
        if (button.dataset.value === "custom") customSceneDividerInput.focus();
    });
});
customSceneDividerInput.addEventListener("input", () => {
    chapterSettingsDraft.sceneSeparator.custom = customSceneDividerInput.value;
    syncSceneBreakControls(chapterSettingsDialog, chapterSettingsDraft.sceneSeparator);
});
sceneBreakPopover.querySelectorAll("[data-scene-divider-presets] button").forEach((button) => {
    button.addEventListener("click", () => {
        const patch = { preset: button.dataset.value };
        if (button.dataset.value === "custom" && activeSceneBreak) {
            patch.custom = sceneBreakAttributes(
                sceneBreakSettingsForEditor(activeSceneBreak.chapter.editor),
            ).custom;
        }
        updateActiveSceneBreak(patch);
    });
});
closeSceneBreakPopoverButton.addEventListener("click", () => {
    closeSceneBreakPopover({ restoreEditorFocus: true });
});
insertChapterVariableButton.addEventListener("click", insertChapterVariable);
insertChapterVariableButton.addEventListener("pointerdown", (event) => event.preventDefault());
chapterTemplateEditorElement.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chapterVariableTarget?.kind === "editor") {
        event.preventDefault();
        event.stopPropagation();
        hideChapterVariableMenu();
    }
}, { capture: true });

document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
        if (chapterCustomizerOpen) closeChapterCustomizer({ restoreFocus: false });
    }, { capture: true });
});

toolbarButtons.forEach((button) => {
    button.addEventListener("click", () => {
        runToolbarCommand(activeChapter?.editor, button.dataset.command);
    });
});

alignmentMenu.addEventListener("change", () => {
    const editor = activeChapter?.editor;
    if (editor) {
        editor.chain().focus().setTextAlign(alignmentMenu.value).run();
    }
});

alignmentMenu.addEventListener("custom-select-action", (event) => {
    const editor = activeChapter?.editor;
    if (!editor || !["increase-indent", "decrease-indent"].includes(event.detail.action)) return;
    const direction = event.detail.action === "increase-indent" ? 1 : -1;
    changeBlockIndent(editor, direction);
});

blockStyleControl.addEventListener("change", () => {
    const editor = activeChapter?.editor;
    const definition = STYLE_DEFINITIONS.find(({ key }) => key === blockStyleControl.value);
    if (!editor || !definition) return;
    if (definition.node === "opening") {
        const range = openingRangeForChapter(activeChapter);
        if (range) {
            editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).run();
        } else {
            openChapterSettings();
        }
        return;
    }
    const chain = editor.chain().focus();
    if (definition.node === "paragraph") {
        chain.setParagraph().run();
    } else {
        chain.setHeading({ level: definition.level }).run();
    }
});

fontFamilyControl.addEventListener("change", () => {
    const editor = activeChapter?.editor;
    if (!editor) return;
    prepareOpeningStyleOverride(editor);
    const chain = editor.chain().focus();
    (fontFamilyControl.value
        ? chain.setFontFamily(fontFamilyControl.value)
        : chain.unsetFontFamily()
    ).run();
});

fontSizeInput.addEventListener("focus", () => {
    fontSizeInput.select();
    openFontSizeMenu();
});

fontSizeInput.addEventListener("click", () => {
    fontSizeInput.select();
    openFontSizeMenu();
});

fontSizeInput.addEventListener("input", syncFontSizeOptions);
fontSizeInput.addEventListener("change", () => {
    applyFontSize(fontSizeInput.value, { focusEditor: false });
});
fontSizeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        applyFontSize(fontSizeInput.value);
        closeFontSizeMenu();
    } else if (event.key === "Escape") {
        event.preventDefault();
        fontSizeInput.value = formatFontSize(currentEditorFontSize());
        closeFontSizeMenu();
        activeChapter?.editor.commands.focus();
    } else if (event.key === "ArrowDown") {
        event.preventDefault();
        openFontSizeMenu();
        const selectedOption = fontSizeMenu.querySelector('[aria-selected="true"]');
        (selectedOption || fontSizeMenu.querySelector("[data-font-size-option]"))?.focus();
    }
});

decreaseFontSizeButton.addEventListener("click", () => {
    closeFontSizeMenu();
    applyFontSize(stepFontSize(fontSizeInput.value, -1, currentEditorFontSize()));
});

increaseFontSizeButton.addEventListener("click", () => {
    closeFontSizeMenu();
    applyFontSize(stepFontSize(fontSizeInput.value, 1, currentEditorFontSize()));
});

zoomTrigger.addEventListener("click", () => {
    if (zoomMenu.hidden) openZoomMenu();
    else closeZoomMenu();
});

zoomOutButton.addEventListener("click", () => {
    setEditorZoom(stepEditorZoom(editorZoom, -1));
});

zoomInButton.addEventListener("click", () => {
    setEditorZoom(stepEditorZoom(editorZoom, 1));
});

zoomLevelButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setEditorZoom(button.dataset.zoomLevel);
        closeZoomMenu({ restoreFocus: true });
    });
});

zoomMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeZoomMenu({ restoreFocus: true });
        return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = Math.max(0, zoomLevelButtons.indexOf(document.activeElement));
    const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
            ? zoomLevelButtons.length - 1
            : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + zoomLevelButtons.length)
                % zoomLevelButtons.length;
    zoomLevelButtons[nextIndex].focus();
});

document.addEventListener("keydown", (event) => {
    if (statusBar.hidden) return;
    const direction = editorZoomShortcutDirection(event);
    if (!direction) return;
    event.preventDefault();
    setEditorZoom(stepEditorZoom(editorZoom, direction));
}, { capture: true });

document.addEventListener("pointerdown", (event) => {
    if (!zoomMenu.hidden && !zoomControl.contains(event.target)) closeZoomMenu();
    if (
        fontSizeMenu
        && !fontSizeMenu.hidden
        && !fontSizePicker.contains(event.target)
        && !fontSizeMenu.contains(event.target)
    ) {
        closeFontSizeMenu();
    }
    if (
        !grammarPopover.hidden
        && !grammarPopover.contains(event.target)
        && !event.target.closest?.("[data-grammar-issue]")
    ) {
        closeGrammarPopover();
    }
    if (!selectionPopover.hidden && !selectionPopover.contains(event.target)) {
        closeSelectionPopover();
    }
    if (
        !sceneBreakPopover.hidden
        && !sceneBreakPopover.contains(event.target)
        && !event.target.closest?.("hr[data-scene-break]")
    ) {
        closeSceneBreakPopover();
    }
    if (
        !chapterVariableMenu.hidden
        && !chapterVariableMenu.contains(event.target)
        && event.target !== chapterVariableTarget?.input
        && !event.target.closest?.("[data-chapter-template-editor]")
    ) {
        hideChapterVariableMenu();
    }
});

document.addEventListener("contextmenu", (event) => {
    const sceneBreakElement = event.target.closest?.("hr[data-scene-break]");
    if (!sceneBreakElement) return;
    const article = sceneBreakElement.closest(".chapter-section");
    const chapter = article === templateChapter?.article
        ? templateChapter
        : chapterStates.find((candidate) => candidate.article === article);
    if (!chapter?.editor) return;
    event.preventDefault();
    let position = chapter.editor.view.posAtDOM(sceneBreakElement, 0);
    if (chapter.editor.state.doc.nodeAt(position)?.type.name !== "horizontalRule") position -= 1;
    openSceneBreakPopover(chapter, position, event.clientX, event.clientY);
});

window.addEventListener("resize", () => {
    positionFontSizeMenu();
    if (activeGrammarIssue) {
        const anchor = grammarHighlightForIssue(
            activeGrammarIssue.chapter,
            activeGrammarIssue.issue,
        );
        if (anchor) positionGrammarPopover(anchor);
        else closeGrammarPopover();
    }
    if (!selectionPopover.hidden) closeSelectionPopover();
    if (!chapterVariableMenu.hidden) hideChapterVariableMenu();
    if (!sceneBreakPopover.hidden) closeSceneBreakPopover();
});
document.addEventListener("scroll", (event) => {
    if (fontSizeMenu && !fontSizeMenu.hidden && event.target !== fontSizeMenu) {
        closeFontSizeMenu();
    }
    if (!grammarPopover.hidden && !grammarPopover.contains(event.target)) {
        closeGrammarPopover();
    }
    if (!selectionPopover.hidden && !selectionPopover.contains(event.target)) {
        closeSelectionPopover();
    }
    if (!sceneBreakPopover.hidden && !sceneBreakPopover.contains(event.target)) {
        closeSceneBreakPopover();
    }
}, true);

fontColorControl.addEventListener("input", () => {
    const color = fontColorControl.value;
    const editor = restoreColorFormattingSelection(fontColorControl);
    fontColorSwatch.style.backgroundColor = color;
    if (updateSelectedSceneBreak(editor, { color })) return;
    prepareOpeningStyleOverride(editor);
    editor?.chain().focus().setColor(color).run();
    setColorPickerValue(fontColorControl, color);
});

highlightColorControl.addEventListener("input", () => {
    const color = highlightColorControl.value;
    const editor = restoreColorFormattingSelection(highlightColorControl);
    highlightSwatch.style.backgroundColor = color;
    editor?.chain().focus().setBackgroundColor(color).run();
    setColorPickerValue(highlightColorControl, color);
});

lineHeightControl.addEventListener("change", () => {
    const editor = activeChapter?.editor;
    if (!editor) return;
    const chain = editor.chain().focus();
    (lineHeightControl.value
        ? chain.setLineHeight(lineHeightControl.value)
        : chain.unsetLineHeight()
    ).run();
});

fontSelects.forEach((select) => {
    select.addEventListener("custom-select-action", (event) => {
        if (event.detail.action !== "font-library") return;
        const trigger = select.closest(".custom-select")?.querySelector(".custom-select-trigger");
        void openFontLibrary(trigger, select);
    });
});
document.querySelector("[data-close-font-library]").addEventListener("click", closeFontLibrary);
fontLibraryBackdrop.addEventListener("click", closeFontLibrary);
fontSearch.addEventListener("input", () => {
    clearTimeout(fontSearchTimer);
    fontSearchTimer = setTimeout(renderFontCatalog, 180);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sceneBreakPopover.hidden) {
        event.preventDefault();
        closeSceneBreakPopover({ restoreEditorFocus: true });
    } else if (event.key === "Escape" && chapterSettingsOpen) {
        event.preventDefault();
        closeChapterSettings();
    } else if (event.key === "Escape" && !selectionPopover.hidden) {
        event.preventDefault();
        closeSelectionPopover();
    } else if (event.key === "Escape" && chapterCustomizerOpen && chapterVariableMenu.hidden) {
        event.preventDefault();
        closeChapterCustomizer();
    } else if (event.key === "Escape" && !grammarPopover.hidden) {
        event.preventDefault();
        closeGrammarPopover();
    } else if (event.key === "Escape" && !fontLibrary.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeFontLibrary();
    } else if (event.key === "Escape" && !grammarPanel.hidden) {
        event.preventDefault();
        closeGrammarPanel();
    }
});

bookScroll.addEventListener("scroll", () => {
    if (scrollFrame === null) {
        scrollFrame = window.requestAnimationFrame(updateChapterFromScroll);
    }
}, { passive: true });

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        chapterStates.forEach((chapter) => void saveChapter(chapter));
    }
});

window.addEventListener("online", () => {
    chapterStates.filter((chapter) => chapter.saveStatus === "error").forEach(
        (chapter) => scheduleChapterSave(chapter, 0)
    );
});

window.addEventListener("pagehide", () => {
    chapterStates.forEach((chapter) => {
        clearTimeout(chapter.saveTimeout);
        const content = chapter.editor.getJSON();
        const settings = chapter.settings;
        const json = JSON.stringify({ content, settings });
        const savePath = chapterPath(chapter);

        if (json === chapter.lastSaved && savePath === chapter.lastSavedPath) {
            return;
        }

        writeBackup(chapter);
        void fetch(savePath, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, settings, client_updated_at: chapter.revision }),
            keepalive: true,
        });
    });
});

setEditorZoom(storedEditorZoom(), { persist: false });
void loadEnglishDictionary();
await loadBook();
