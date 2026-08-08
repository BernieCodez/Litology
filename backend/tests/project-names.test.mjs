import test from "node:test";
import assert from "node:assert/strict";

import {
    cleanProjectName,
    nextAvailableProjectName,
    projectChaptersPath,
    projectDocumentPath,
} from "../static/js/project-names.mjs";

test("cleans surrounding and repeated whitespace", () => {
    assert.equal(cleanProjectName("  A   New\nStory  "), "A New Story");
});

test("keeps an available project name", () => {
    assert.equal(
        nextAvailableProjectName("Story", { 1: "Another Story" }, 2),
        "Story",
    );
});

test("increments past every existing version", () => {
    assert.equal(
        nextAvailableProjectName(
            "Story",
            { 1: "Story", 2: "Story (2)", 3: "Story (3)" },
            4,
        ),
        "Story (4)",
    );
});

test("increments a confirmed numbered duplicate", () => {
    assert.equal(
        nextAvailableProjectName(
            "Story (2)",
            { 1: "Story", 2: "Story (2)" },
            3,
        ),
        "Story (3)",
    );
});

test("compares names case-insensitively and excludes the current project", () => {
    assert.equal(nextAvailableProjectName("story", { 1: "Story" }, 2), "story (2)");
    assert.equal(nextAvailableProjectName("Story", { 1: "Story" }, 1), "Story");
});

test("handles regular-expression punctuation in project names", () => {
    assert.equal(
        nextAvailableProjectName("Draft [final]", { 1: "Draft [final]" }, 2),
        "Draft [final] (2)",
    );
});

test("uses the confirmed project name in the chapter save path", () => {
    assert.equal(
        projectDocumentPath("Story (2)", 1),
        "/api/projects/Story%20(2)/chapters/1",
    );
    assert.equal(
        projectDocumentPath("Notes / Draft", "chapter one"),
        "/api/projects/Notes%20%2F%20Draft/chapters/chapter%20one",
    );
});

test("uses the confirmed project name in the chapter collection path", () => {
    assert.equal(
        projectChaptersPath("Story (2)"),
        "/api/projects/Story%20(2)/chapters",
    );
});
