import assert from "node:assert/strict";
import test from "node:test";

import {
    DEFAULT_CHAPTER_SETTINGS,
    chapterContentFromTemplate,
    chapterVariableQuery,
    chapterNumberLabel,
    insertChapterNumberVariable,
    normalizeChapterSettings,
    normalizeSceneSeparator,
    openingTextRange,
    sceneBreakContentWithDefaults,
    sceneSeparatorSymbol,
    settingsWithMatchedTextStyle,
    styleKeyForAttributes,
} from "../static/js/chapter-customization.mjs";

test("normalization fills every reusable style without mutating defaults", () => {
    const settings = normalizeChapterSettings({
        styles: { h1: { fontFamily: "Georgia", fontSize: 60 } },
    });

    assert.equal(settings.styles.h1.fontFamily, "Georgia");
    assert.equal(settings.styles.h1.fontSize, 60);
    assert.equal(settings.styles.normal.fontSize, DEFAULT_CHAPTER_SETTINGS.styles.normal.fontSize);
    settings.styles.normal.fontSize = 99;
    assert.equal(DEFAULT_CHAPTER_SETTINGS.styles.normal.fontSize, 17);
});

test("selected inline formatting can update its reusable text style", () => {
    const settings = settingsWithMatchedTextStyle(DEFAULT_CHAPTER_SETTINGS, "normal", {
        textStyle: { color: "#c84e4e", fontFamily: "Georgia", fontSize: "19px" },
        marks: ["italic"],
        blockAttributes: { textAlign: "center" },
    });

    assert.equal(settings.styles.normal.color, "#c84e4e");
    assert.equal(settings.styles.normal.fontFamily, "Georgia");
    assert.equal(settings.styles.normal.fontSize, 19);
    assert.equal(settings.styles.normal.italic, true);
    assert.equal(settings.styles.normal.alignment, "center");
    assert.equal(settings.styles.h1.color, DEFAULT_CHAPTER_SETTINGS.styles.h1.color);
});

test("explicit off overrides can remove inherited reusable formatting", () => {
    const settings = settingsWithMatchedTextStyle(
        { styles: { normal: { bold: true, italic: true, underline: true } } },
        "normal",
        {
            textStyle: {
                boldOverride: "off",
                italicOverride: "off",
                underlineOverride: "off",
            },
            marks: [],
        },
    );

    assert.equal(settings.styles.normal.bold, false);
    assert.equal(settings.styles.normal.italic, false);
    assert.equal(settings.styles.normal.underline, false);
});

test("selected opening text can update the reusable opening text style", () => {
    const settings = settingsWithMatchedTextStyle(DEFAULT_CHAPTER_SETTINGS, "opening", {
        textStyle: { color: "#536b45", fontFamily: "Georgia", fontSize: "52px" },
        marks: ["italic", "underline"],
        explicitFormatting: true,
    });

    assert.equal(settings.opening.color, "#536b45");
    assert.equal(settings.opening.fontFamily, "Georgia");
    assert.equal(settings.opening.fontSize, 52);
    assert.equal(settings.opening.bold, false);
    assert.equal(settings.opening.italic, true);
    assert.equal(settings.opening.underline, true);
});

test("chapter templates keep a reusable default chapter name", () => {
    assert.equal(normalizeChapterSettings({}).chapterName, "Chapter Name");
    assert.equal(normalizeChapterSettings({ chapterName: "  A New Beginning  " }).chapterName, "A New Beginning");
    assert.equal(normalizeChapterSettings({ chapterName: "" }).chapterName, "Chapter Name");
});

test("freeform chapter templates replace chapter number variables without mutating the template", () => {
    const template = {
        type: "doc",
        content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Chapter @chapter_number" }] },
            { type: "paragraph", content: [{ type: "text", text: "Part {chapter_number} begins here." }] },
        ],
    };
    const chapter = chapterContentFromTemplate(template, 7);

    assert.equal(chapter.content[0].content[0].text, "Chapter 7");
    assert.equal(chapter.content[1].content[0].text, "Part 7 begins here.");
    assert.equal(template.content[0].content[0].text, "Chapter @chapter_number");
});

test("normalization keeps an arbitrary Tiptap chapter template and its label", () => {
    const settings = normalizeChapterSettings({
        templateNumberLabel: "BOOK @chapter_number",
        templateContent: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Opening line" }] }],
        },
    });
    assert.equal(settings.templateNumberLabel, "BOOK @chapter_number");
    assert.equal(settings.templateContent.content[0].content[0].text, "Opening line");
});

test("legacy chapter styles migrate into the project-wide H1-H4 model", () => {
    const settings = normalizeChapterSettings({
        styles: { title: { fontFamily: "Georgia" }, body: { fontSize: 19 } },
    });
    assert.equal(settings.styles.h1.fontFamily, "Georgia");
    assert.equal(settings.styles.normal.fontSize, 19);
});

test("chapter number labels support a custom value and an automatic fallback", () => {
    assert.equal(chapterNumberLabel({}, 3), "CHAPTER 3");
    assert.equal(chapterNumberLabel({ numberLabel: "  Part One  " }, 3), "Part One");
    assert.equal(chapterNumberLabel({ numberLabel: "" }, 7), "CHAPTER 7");
    assert.equal(chapterNumberLabel({ numberLabel: "C#{chapter_number}" }, 12), "C#12");
    assert.equal(chapterNumberLabel({ numberLabel: "Scene @chapter_number" }, 4), "Scene 4");

    const settings = normalizeChapterSettings({
        numberLabel: `Prelude\n${"x".repeat(100)}`,
    });
    assert.equal(settings.numberLabel.includes("\n"), false);
    assert.equal(settings.numberLabel.length, 80);
});

test("opening text supports sentence lead-ins and advanced emphasis", () => {
    const settings = normalizeChapterSettings({
        opening: {
            mode: "sentence",
            layout: "inline",
            fontSize: 42,
            italic: true,
            underline: true,
            uppercase: true,
            letterSpacing: 2.5,
        },
    });

    assert.equal(settings.opening.mode, "sentence");
    assert.equal(settings.opening.layout, "inline");
    assert.equal(settings.opening.fontSize, 42);
    assert.equal(settings.opening.italic, true);
    assert.equal(settings.opening.underline, true);
    assert.equal(settings.opening.uppercase, true);
    assert.equal(settings.opening.letterSpacing, 2.5);
});

test("opening text ranges target the first character, word, or sentence", () => {
    const text = "  The rain stopped. Then the door opened.";
    assert.deepEqual(openingTextRange(text, "character"), { from: 2, to: 3 });
    assert.deepEqual(openingTextRange(text, "word"), { from: 2, to: 5 });
    assert.deepEqual(openingTextRange(text, "sentence"), { from: 2, to: 19 });
    assert.equal(openingTextRange(text, "none"), null);
});

test("chapter number label typography is normalized independently", () => {
    const settings = normalizeChapterSettings({
        numberLabelStyle: {
            fontFamily: "Georgia",
            fontSize: 60,
            color: "rgba(217, 130, 91, 0.45)",
            letterSpacing: 20,
            spacing: -4,
            alignment: "center",
            bold: false,
            italic: true,
            uppercase: false,
        },
    });

    assert.equal(settings.numberLabelStyle.fontFamily, "Georgia");
    assert.equal(settings.numberLabelStyle.fontSize, 48);
    assert.equal(settings.numberLabelStyle.color, "rgba(217, 130, 91, 0.45)");
    assert.equal(settings.numberLabelStyle.letterSpacing, 12);
    assert.equal(settings.numberLabelStyle.spacing, 0);
    assert.equal(settings.numberLabelStyle.alignment, "center");
    assert.equal(settings.numberLabelStyle.bold, false);
    assert.equal(settings.numberLabelStyle.italic, true);
    assert.equal(settings.numberLabelStyle.uppercase, false);
});

test("unsafe and out-of-range customization values are constrained", () => {
    const settings = normalizeChapterSettings({
        styles: {
            normal: {
                fontFamily: "url(javascript:alert(1))",
                fontSize: 200,
                color: "red; display:none",
                alignment: "diagonal",
                lineHeight: 0,
            },
        },
        opening: { fontSize: 500, color: "not-a-color" },
    });

    assert.equal(settings.styles.normal.fontFamily, "Playfair Display");
    assert.equal(settings.styles.normal.fontSize, 96);
    assert.equal(settings.styles.normal.color, "#14131f");
    assert.equal(settings.styles.normal.alignment, "left");
    assert.equal(settings.styles.normal.lineHeight, 0.8);
    assert.equal(settings.opening.fontSize, 144);
    assert.equal(settings.opening.color, "#d9825b");
});

test("scene separator presets and custom ornaments resolve predictably", () => {
    assert.equal(sceneSeparatorSymbol({ sceneSeparator: { preset: "fleuron" } }), "❦");
    assert.equal(
        sceneSeparatorSymbol({ sceneSeparator: { preset: "custom", custom: "— § —" } }),
        "— § —"
    );
});

test("editor heading levels map to the visible style names", () => {
    assert.equal(styleKeyForAttributes({ level: 1 }), "h1");
    assert.equal(styleKeyForAttributes({ level: 2 }), "h2");
    assert.equal(styleKeyForAttributes({ level: 3 }), "h3");
    assert.equal(styleKeyForAttributes({ level: 4 }), "h4");
    assert.equal(styleKeyForAttributes({ level: 5 }), "normal");
    assert.equal(styleKeyForAttributes({}), "normal");
});

test("scene break defaults normalize line styling and preserve emoji ornaments", () => {
    assert.deepEqual(normalizeChapterSettings({}).sceneSeparator, {
        preset: "line",
        custom: "◆◆◆",
        color: "#536b45",
        thickness: 2,
    });
    assert.deepEqual(normalizeSceneSeparator({
        preset: "dotted",
        custom: "🌙  🌙  🌙",
        color: "#123abc",
        thickness: 20,
    }), {
        preset: "dotted",
        custom: "🌙  🌙  🌙",
        color: "#123abc",
        thickness: 8,
    });
});

test("legacy scene breaks inherit the saved chapter default without changing styled breaks", () => {
    const content = sceneBreakContentWithDefaults({
        type: "doc",
        content: [
            { type: "horizontalRule" },
            { type: "horizontalRule", attrs: { preset: "dotted", color: "#123abc", thickness: 4 } },
        ],
    }, { sceneSeparator: { preset: "fleuron", color: "#654321", thickness: 3 } });

    assert.equal(content.content[0].attrs.preset, "fleuron");
    assert.equal(content.content[0].attrs.color, "#654321");
    assert.equal(content.content[1].attrs.preset, "dotted");
    assert.equal(content.content[1].attrs.color, "#123abc");
    assert.equal(content.content[1].attrs.thickness, 4);
});

test("opening text migrates legacy em sizes and preserves toolbar pixel sizes", () => {
    assert.equal(normalizeChapterSettings({ opening: { fontSize: 3.4 } }).opening.fontSize, 57.8);
    assert.equal(normalizeChapterSettings({
        opening: { fontSize: 8, fontSizeUnit: "px" },
    }).opening.fontSize, 8);
});

test("typing @ exposes and inserts the chapter number variable", () => {
    assert.deepEqual(chapterVariableQuery("CHAPTER @chap", 13), {
        from: 8, to: 13, query: "chap",
    });
    assert.equal(chapterVariableQuery("CHAPTER text", 12), null);
    assert.deepEqual(insertChapterNumberVariable("CHAPTER @chap", 13), {
        value: "CHAPTER @chapter_number",
        cursor: 23,
    });
});
