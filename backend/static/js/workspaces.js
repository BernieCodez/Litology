import { enhanceAllSelects } from "/static/js/custom-select.mjs?v=20260807-3";
import {
    enhanceWorkspacePickers,
    storyDateFromValue,
    workspacePickerMarkup,
} from "/static/js/workspace-pickers.mjs?v=20260807-3";

const projectId = document.body.dataset.projectId || "draft";
const STORAGE_KEY = `litology.workspaces.${projectId}`;
const sectionButtons = [...document.querySelectorAll("[data-section]")];
const bookOnlyElements = [...document.querySelectorAll("[data-book-only]")];
const workspacePages = document.querySelector("[data-workspace-pages]");
const editorMain = document.querySelector(".editor-main");
const chapterNavigation = document.querySelector("[data-chapter-navigation]");
const addSectionButton = document.querySelector(".add-section-button");

const emptyState = () => ({
    plot: [],
    characters: [],
    locations: [],
    miscellaneous: "",
});

function loadState() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
        return {
            ...emptyState(),
            ...(saved && typeof saved === "object" ? saved : {}),
            plot: Array.isArray(saved?.plot) ? saved.plot : [],
            characters: Array.isArray(saved?.characters) ? saved.characters : [],
            locations: Array.isArray(saved?.locations) ? saved.locations : [],
        };
    } catch {
        return emptyState();
    }
}

let state = loadState();
let activePlotTab = "chapters";
let activeCharacterId = state.characters[0]?.id || null;
let timelineView = "line";
let calendarCursor = null;

function saveState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function truncate(value, maximum = 145) {
    const text = String(value || "").trim();
    return text.length > maximum ? `${text.slice(0, maximum - 1).trim()}…` : text;
}

function displayDate(date, time = "") {
    if (!date) return "Not scheduled";
    const value = storyDateFromValue(date);
    if (value && time) {
        const [hours, minutes] = time.split(":").map(Number);
        value.setHours(hours, minutes, 0, 0);
    }
    if (!value || Number.isNaN(value.getTime())) return date;
    return value.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }) + (time ? ` · ${formatTime(time)}` : "");
}

function formatTime(time) {
    if (!time) return "Any time";
    const [hours, minutes] = time.split(":").map(Number);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
        .format(new Date(2020, 0, 1, hours, minutes));
}

function switchSection(section) {
    const isBook = section === "book";
    sectionButtons.forEach((button) => {
        const active = button.dataset.section === section;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });
    bookOnlyElements.forEach((element) => { element.hidden = !isBook; });
    chapterNavigation.hidden = !isBook;
    addSectionButton.hidden = !isBook;
    editorMain.classList.toggle("is-section-page", !isBook);
    workspacePages.hidden = isBook;
    document.querySelectorAll("[data-workspace-page]").forEach((page) => {
        page.hidden = isBook || page.dataset.workspacePage !== section;
    });

    if (section === "plot") renderPlot();
    if (section === "characters") renderCharacters();
    if (section === "settings") renderSettings();
    if (section === "timeline") renderTimeline();
    if (section === "miscellaneous") syncNotepad();
    window.history.replaceState(null, "", `${window.location.pathname}#${section}`);
}

function emptyMarkup(icon, title, copy) {
    return `<div class="workspace-empty"><i class="${icon}" aria-hidden="true"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`;
}

function showWorkspaceDialog({ title, description, fields, values = {}, onSubmit }) {
    const dialog = document.createElement("dialog");
    dialog.className = "workspace-dialog";
    dialog.innerHTML = `
        <header><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></header>
        <form method="dialog" class="workspace-form">
            ${fields.map((field) => {
                const value = values[field.name] ?? field.value ?? "";
                const wide = field.wide ? " wide" : "";
                const common = `name="${field.name}" ${field.required ? "required" : ""} ${field.maxlength ? `maxlength="${field.maxlength}"` : ""}`;
                if (field.type === "textarea") {
                    return `<label class="workspace-field${wide}"><span>${escapeHtml(field.label)}</span><textarea ${common} placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(value)}</textarea></label>`;
                }
                if (field.type === "select") {
                    return `<label class="workspace-field${wide}"><span>${escapeHtml(field.label)}</span><select ${common}>${field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;
                }
                if (field.type === "date" || field.type === "time") {
                    return workspacePickerMarkup(field, value);
                }
                return `<label class="workspace-field${wide}"><span>${escapeHtml(field.label)}</span><input type="${field.type || "text"}" ${common} value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}" ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""} ${field.step ? `step="${field.step}"` : ""}></label>`;
            }).join("")}
            <div class="dialog-actions"><button type="button" data-dialog-cancel>Cancel</button><button type="submit">Save</button></div>
        </form>`;
    document.body.append(dialog);
    enhanceAllSelects(dialog);
    enhanceWorkspacePickers(dialog);
    const form = dialog.querySelector("form");
    dialog.querySelector("[data-dialog-cancel]").addEventListener("click", () => dialog.close());
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        onSubmit(Object.fromEntries(new FormData(form)));
        dialog.close();
    });
    dialog.addEventListener("close", () => dialog.remove());
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
    dialog.showModal();
    form.querySelector('input:not([type="hidden"]), textarea, .workspace-picker-trigger, .custom-select-trigger')?.focus();
}

// Plot
const plotList = document.querySelector("[data-plot-list]");

function plotTabLabel(kind) {
    return {
        chapters: "Chapter summary",
        outline: "Story beat",
        arcs: "Arc moment",
    }[kind];
}

function openPlotDialog(item = {}) {
    const kind = item.kind || activePlotTab;
    showWorkspaceDialog({
        title: item.id ? `Edit ${plotTabLabel(kind).toLowerCase()}` : `New ${plotTabLabel(kind).toLowerCase()}`,
        description: "Capture the idea briefly. You can develop it into full prose in Book.",
        values: { ...item, kind },
        fields: [
            { name: "title", label: "Title", required: true, maxlength: 80, wide: true, placeholder: kind === "chapters" ? "Chapter 1 — The arrival" : "Inciting incident" },
            { name: "summary", label: "Short summary", type: "textarea", maxlength: 360, wide: true, placeholder: "Two or three sentences describing what changes…" },
            { name: "date", label: "Story date", type: "date" },
            { name: "time", label: "Story time", type: "time" },
            { name: "tag", label: "Label", maxlength: 30, placeholder: "Act I, mystery, climax…" },
            { name: "kind", label: "Plot subtab", type: "select", options: [
                { value: "chapters", label: "Chapter summaries" },
                { value: "outline", label: "Story outline" },
                { value: "arcs", label: "Story arcs" },
            ] },
        ],
        onSubmit: (values) => {
            const next = { ...item, ...values, id: item.id || makeId("plot"), createdAt: item.createdAt || Date.now() };
            const index = state.plot.findIndex((candidate) => candidate.id === item.id);
            if (index >= 0) state.plot[index] = next;
            else state.plot.push(next);
            activePlotTab = next.kind;
            saveState();
            renderPlot();
            renderTimeline();
        },
    });
}

function removePlot(id) {
    const item = state.plot.find((candidate) => candidate.id === id);
    if (!item || !window.confirm(`Delete “${item.title}”?`)) return;
    state.plot = state.plot.filter((candidate) => candidate.id !== id);
    saveState();
    renderPlot();
    renderTimeline();
}

function renderPlot() {
    const items = state.plot.filter((item) => item.kind === activePlotTab);
    document.querySelector("[data-plot-count]").textContent = state.plot.length;
    document.querySelector("[data-scheduled-count]").textContent = state.plot.filter((item) => item.date).length;
    document.querySelectorAll("[data-plot-tab]").forEach((button) => {
        const active = button.dataset.plotTab === activePlotTab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
    });
    if (!items.length) {
        plotList.innerHTML = emptyMarkup("fa-solid fa-feather-pointed", `No ${plotTabLabel(activePlotTab).toLowerCase()}s yet`, "Add a concise plot point here. It can be scheduled on your timeline whenever you are ready.");
        return;
    }
    plotList.innerHTML = items.map((item, index) => `
        <article class="plot-card" data-kind="${escapeHtml(item.kind)}">
            <div class="plot-card-head"><span class="plot-card-order">${escapeHtml(plotTabLabel(item.kind))} ${index + 1}</span><div class="card-actions">
                <button class="card-icon-button" type="button" data-edit-plot="${item.id}" aria-label="Edit ${escapeHtml(item.title)}"><i class="fa-solid fa-pen"></i></button>
                <button class="card-icon-button" type="button" data-delete-plot="${item.id}" aria-label="Delete ${escapeHtml(item.title)}"><i class="fa-regular fa-trash-can"></i></button>
            </div></div>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="plot-card-summary">${escapeHtml(truncate(item.summary || "No summary yet.", 220))}</p>
            <div class="plot-card-footer"><i class="fa-regular fa-clock"></i><span>${escapeHtml(displayDate(item.date, item.time))}</span>${item.tag ? `<span class="tag-pill">${escapeHtml(item.tag)}</span>` : ""}</div>
        </article>`).join("");
}

document.querySelector("[data-add-plot]").addEventListener("click", () => openPlotDialog());
document.querySelectorAll("[data-plot-tab]").forEach((button) => button.addEventListener("click", () => {
    activePlotTab = button.dataset.plotTab;
    renderPlot();
}));
plotList.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-plot]");
    const remove = event.target.closest("[data-delete-plot]");
    if (edit) openPlotDialog(state.plot.find((item) => item.id === edit.dataset.editPlot));
    if (remove) removePlot(remove.dataset.deletePlot);
});

// Characters
const characterList = document.querySelector("[data-character-list]");
const characterDetail = document.querySelector("[data-character-detail]");
const characterSearch = document.querySelector("[data-character-search]");

function initials(name = "?") {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function openCharacterDialog(item = {}) {
    showWorkspaceDialog({
        title: item.id ? "Edit character" : "New character",
        description: "Build a reference sheet you can return to while drafting.",
        values: item,
        fields: [
            { name: "name", label: "Character name", required: true, maxlength: 80, wide: true, placeholder: "Full name or working name" },
            { name: "role", label: "Role", maxlength: 50, placeholder: "Protagonist, mentor…" },
            { name: "tags", label: "Tags", maxlength: 100, placeholder: "main, detective, family" },
            { name: "physical", label: "Physical description", type: "textarea", wide: true, placeholder: "Appearance, posture, clothing, distinguishing features…" },
            { name: "personality", label: "Personality", type: "textarea", wide: true, placeholder: "Temperament, values, fears, contradictions…" },
            { name: "habits", label: "Habits & speech", type: "textarea", wide: true, placeholder: "Gestures, repeated phrases, vocal rhythm…" },
            { name: "relationships", label: "Relationships", type: "textarea", wide: true, placeholder: "How they relate to other characters…" },
            { name: "notes", label: "Other notes", type: "textarea", wide: true, placeholder: "Backstory, goals, secrets, reminders…" },
        ],
        onSubmit: (values) => {
            const next = { ...item, ...values, id: item.id || makeId("character") };
            const index = state.characters.findIndex((candidate) => candidate.id === item.id);
            if (index >= 0) state.characters[index] = next;
            else state.characters.push(next);
            activeCharacterId = next.id;
            saveState();
            renderCharacters();
        },
    });
}

function removeCharacter(id) {
    const item = state.characters.find((candidate) => candidate.id === id);
    if (!item || !window.confirm(`Delete ${item.name}?`)) return;
    state.characters = state.characters.filter((candidate) => candidate.id !== id);
    activeCharacterId = state.characters[0]?.id || null;
    saveState();
    renderCharacters();
}

function renderCharacters() {
    const query = characterSearch.value.trim().toLowerCase();
    const filtered = state.characters.filter((item) => `${item.name} ${item.role} ${item.tags}`.toLowerCase().includes(query));
    characterList.innerHTML = filtered.length ? filtered.map((item) => `
        <button class="record-list-button ${item.id === activeCharacterId ? "is-active" : ""}" type="button" data-character-id="${item.id}">
            <span class="character-avatar">${escapeHtml(initials(item.name))}</span>
            <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.role || "No role assigned")}</small></span>
        </button>`).join("") : `<div class="workspace-empty compact"><p>${query ? "No characters match this search." : "Create your first character to begin the cast."}</p></div>`;

    const character = state.characters.find((item) => item.id === activeCharacterId);
    if (!character) {
        characterDetail.innerHTML = emptyMarkup("fa-solid fa-user-pen", "Your cast starts here", "Create profiles for their appearance, personality, voice, relationships, and private notes.");
        return;
    }
    const tags = String(character.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const section = (title, value, wide = false) => `<section class="character-section ${wide ? "wide" : ""}"><h4>${title}</h4><p>${escapeHtml(value || "Nothing added yet.")}</p></section>`;
    characterDetail.innerHTML = `<article class="character-sheet">
        <header class="character-heading"><span class="character-avatar">${escapeHtml(initials(character.name))}</span><div><h3>${escapeHtml(character.name)}</h3><p>${escapeHtml(character.role || "Role not assigned")}</p></div><div class="card-actions"><button class="card-icon-button" type="button" data-edit-character="${character.id}" aria-label="Edit character"><i class="fa-solid fa-pen"></i></button><button class="card-icon-button" type="button" data-delete-character="${character.id}" aria-label="Delete character"><i class="fa-regular fa-trash-can"></i></button></div></header>
        ${tags.length ? `<div class="character-tags" style="margin-top:18px">${tags.map((tag) => `<span class="record-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="character-sections">${section("Physical description", character.physical)}${section("Personality", character.personality)}${section("Habits & speech", character.habits)}${section("Relationships", character.relationships)}${section("Other notes", character.notes, true)}</div>
    </article>`;
}

document.querySelector("[data-add-character]").addEventListener("click", () => openCharacterDialog());
characterSearch.addEventListener("input", renderCharacters);
characterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-character-id]");
    if (!button) return;
    activeCharacterId = button.dataset.characterId;
    renderCharacters();
});
characterDetail.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-character]");
    const remove = event.target.closest("[data-delete-character]");
    if (edit) openCharacterDialog(state.characters.find((item) => item.id === edit.dataset.editCharacter));
    if (remove) removeCharacter(remove.dataset.deleteCharacter);
});

// Settings and places
const locationList = document.querySelector("[data-location-list]");
const mapPins = document.querySelector("[data-map-pins]");
const mapEmpty = document.querySelector("[data-map-empty]");
const inspirationGrid = document.querySelector("[data-inspiration-grid]");

function openLocationDialog(item = {}) {
    showWorkspaceDialog({
        title: item.id ? "Edit location" : "New location",
        description: "Record the atmosphere and optionally pin this place on the world map.",
        values: { latitude: "0", longitude: "0", ...item },
        fields: [
            { name: "name", label: "Location name", required: true, maxlength: 80, wide: true, placeholder: "The Glass Harbor" },
            { name: "type", label: "Type", maxlength: 40, placeholder: "City, house, forest…" },
            { name: "tags", label: "Tags", maxlength: 80, placeholder: "home, dangerous, coastal" },
            { name: "description", label: "Detailed description", type: "textarea", wide: true, placeholder: "Architecture, geography, history, mood…" },
            { name: "sensory", label: "Sensory details", type: "textarea", wide: true, placeholder: "Sounds, scents, light, texture, weather…" },
            { name: "travel", label: "Travel notes", type: "textarea", wide: true, placeholder: "Routes, distance, transport, story stops…" },
            { name: "latitude", label: "Map latitude", type: "number", min: -90, max: 90, step: "0.1" },
            { name: "longitude", label: "Map longitude", type: "number", min: -180, max: 180, step: "0.1" },
        ],
        onSubmit: (values) => {
            const next = { ...item, ...values, id: item.id || makeId("location") };
            const index = state.locations.findIndex((candidate) => candidate.id === item.id);
            if (index >= 0) state.locations[index] = next;
            else state.locations.push(next);
            saveState();
            renderSettings();
        },
    });
}

function removeLocation(id) {
    const item = state.locations.find((candidate) => candidate.id === id);
    if (!item || !window.confirm(`Delete ${item.name}?`)) return;
    state.locations = state.locations.filter((candidate) => candidate.id !== id);
    saveState();
    renderSettings();
}

function renderSettings() {
    mapEmpty.hidden = state.locations.length > 0;
    mapPins.innerHTML = state.locations.map((item) => {
        const latitude = Math.max(-90, Math.min(90, Number(item.latitude) || 0));
        const longitude = Math.max(-180, Math.min(180, Number(item.longitude) || 0));
        return `<button class="map-pin" type="button" title="${escapeHtml(item.name)}" aria-label="Edit ${escapeHtml(item.name)}" data-map-location="${item.id}" style="left:${((longitude + 180) / 360) * 100}%;top:${((90 - latitude) / 180) * 100}%"><i class="fa-solid fa-location-dot"></i></button>`;
    }).join("");
    locationList.innerHTML = state.locations.length ? state.locations.map((item) => `
        <article class="location-card"><div class="location-card-head"><h4>${escapeHtml(item.name)}</h4><div class="card-actions"><button class="card-icon-button" type="button" data-edit-location="${item.id}" aria-label="Edit ${escapeHtml(item.name)}"><i class="fa-solid fa-pen"></i></button><button class="card-icon-button" type="button" data-delete-location="${item.id}" aria-label="Delete ${escapeHtml(item.name)}"><i class="fa-regular fa-trash-can"></i></button></div></div><p>${escapeHtml(truncate(item.description || "No description yet.", 190))}</p><div class="location-card-meta">${item.type ? `<span class="tag-pill">${escapeHtml(item.type)}</span>` : ""}${item.tags ? `<span class="tag-pill">${escapeHtml(item.tags.split(",")[0])}</span>` : ""}</div></article>`).join("") : emptyMarkup("fa-solid fa-map-location-dot", "No locations yet", "Add a place to begin your world bible and travel map.");
}

async function searchPlaceImages(query) {
    inspirationGrid.innerHTML = `<div class="image-search-status"><i class="fa-solid fa-spinner fa-spin"></i> Searching Wikimedia Commons…</div>`;
    try {
        const parameters = new URLSearchParams({
            action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "12",
            prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "500", format: "json", origin: "*",
        });
        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`);
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json();
        const images = Object.values(data.query?.pages || {}).filter((page) => page.imageinfo?.[0]?.thumburl).slice(0, 8);
        inspirationGrid.innerHTML = images.length ? images.map((page) => {
            const info = page.imageinfo[0];
            const label = page.title.replace(/^File:/, "");
            const descriptionUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`;
            return `<figure class="inspiration-card"><img src="${escapeHtml(info.thumburl)}" alt="${escapeHtml(label)}" loading="lazy"><a href="${escapeHtml(descriptionUrl)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></figure>`;
        }).join("") : `<div class="image-search-status">No usable images found. Try a broader place name.</div>`;
    } catch {
        inspirationGrid.innerHTML = `<div class="image-search-status">Image search could not connect. Check your connection and try again.</div>`;
    }
}

document.querySelector("[data-add-location]").addEventListener("click", () => openLocationDialog());
locationList.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-location]");
    const remove = event.target.closest("[data-delete-location]");
    if (edit) openLocationDialog(state.locations.find((item) => item.id === edit.dataset.editLocation));
    if (remove) removeLocation(remove.dataset.deleteLocation);
});
mapPins.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-map-location]");
    if (pin) openLocationDialog(state.locations.find((item) => item.id === pin.dataset.mapLocation));
});
document.querySelector("[data-place-search-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.querySelector("[data-place-search]").value.trim();
    if (query) void searchPlaceImages(query);
});

// Timeline and calendar
const timelineContent = document.querySelector("[data-timeline-content]");

function scheduledPlot() {
    const timestamp = (item) => {
        const date = storyDateFromValue(item.date);
        if (!date) return Number.POSITIVE_INFINITY;
        const [hours, minutes] = (item.time || "00:00").split(":").map(Number);
        date.setHours(hours, minutes, 0, 0);
        return date.getTime();
    };
    return state.plot.filter((item) => item.date).sort((a, b) => timestamp(a) - timestamp(b));
}

function renderLineTimeline(items) {
    if (!items.length) return emptyMarkup("fa-solid fa-timeline", "Nothing scheduled yet", "Edit a plot point and give it a story date. It will appear here automatically.");
    const width = Math.max(760, items.length * 220);
    const events = items.map((item, index) => {
        const left = items.length === 1 ? 50 : 5 + (index / (items.length - 1)) * 90;
        return `<article class="timeline-event" style="left:${left}%"><span class="timeline-dot"></span><div class="timeline-event-card"><time>${escapeHtml(displayDate(item.date, item.time))}</time><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(plotTabLabel(item.kind))}</small></div></article>`;
    }).join("");
    return `<div class="timeline-shell" style="width:${width}px"><div class="timeline-track">${events}</div><div class="timeline-range"><span>${escapeHtml(displayDate(items[0].date))}</span><span>${escapeHtml(displayDate(items.at(-1).date))}</span></div></div>`;
}

function dateKey(date) {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function renderCalendar(items) {
    if (!calendarCursor) {
        const seed = storyDateFromValue(items[0]?.date) || new Date();
        calendarCursor = new Date(seed.getFullYear(), seed.getMonth(), 1);
    }
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - first.getDay());
    const days = Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        const key = dateKey(day);
        const dayItems = items.filter((item) => item.date === key);
        return `<button class="calendar-day ${day.getMonth() !== month ? "is-outside" : ""}" type="button" data-calendar-date="${key}" aria-label="Add plot point on ${key}"><span class="calendar-date">${day.getDate()}</span>${dayItems.map((item) => `<span class="calendar-event"><time>${escapeHtml(formatTime(item.time))}</time>${escapeHtml(item.title)}</span>`).join("")}</button>`;
    }).join("");
    const monthLabel = calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return `<div class="calendar"><header class="calendar-header"><div><h3>${escapeHtml(monthLabel)}</h3><small>Click a day to add a scheduled plot point.</small></div><div class="calendar-nav"><button type="button" data-calendar-previous aria-label="Previous month">‹</button><button type="button" data-calendar-next aria-label="Next month">›</button></div></header><div class="calendar-weekdays">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${days}</div></div>`;
}

function renderTimeline() {
    const items = scheduledPlot();
    document.querySelectorAll("[data-timeline-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.timelineView === timelineView));
    timelineContent.innerHTML = timelineView === "calendar" ? renderCalendar(items) : renderLineTimeline(items);
}

document.querySelectorAll("[data-timeline-view]").forEach((button) => button.addEventListener("click", () => {
    timelineView = button.dataset.timelineView;
    renderTimeline();
}));
timelineContent.addEventListener("click", (event) => {
    if (event.target.closest("[data-calendar-previous]")) {
        calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
        renderTimeline();
    } else if (event.target.closest("[data-calendar-next]")) {
        calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
        renderTimeline();
    } else {
        const day = event.target.closest("[data-calendar-date]");
        if (day) openPlotDialog({ date: day.dataset.calendarDate, kind: "chapters" });
    }
});

// Miscellaneous notepad
const miscNotepad = document.querySelector("[data-misc-notepad]");
const notepadState = document.querySelector("[data-notepad-state]");
const notepadWords = document.querySelector("[data-notepad-words]");
let notepadTimer = null;

function syncNotepad() {
    if (miscNotepad.value !== state.miscellaneous) miscNotepad.value = state.miscellaneous;
    const words = miscNotepad.value.trim() ? miscNotepad.value.trim().split(/\s+/).length : 0;
    notepadWords.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
}

miscNotepad.addEventListener("input", () => {
    clearTimeout(notepadTimer);
    const words = miscNotepad.value.trim() ? miscNotepad.value.trim().split(/\s+/).length : 0;
    notepadWords.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
    notepadState.classList.add("is-saving");
    notepadState.innerHTML = "<i></i> Saving…";
    notepadTimer = window.setTimeout(() => {
        state.miscellaneous = miscNotepad.value;
        saveState();
        notepadState.classList.remove("is-saving");
        notepadState.innerHTML = "<i></i> Saved";
    }, 450);
});

window.addEventListener("pagehide", () => {
    if (!notepadTimer) return;
    clearTimeout(notepadTimer);
    state.miscellaneous = miscNotepad.value;
    saveState();
});

sectionButtons.forEach((button) => button.addEventListener("click", () => switchSection(button.dataset.section)));
const requestedSection = window.location.hash.slice(1);
switchSection(sectionButtons.some((button) => button.dataset.section === requestedSection) ? requestedSection : "book");
