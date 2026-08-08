const selectStates = new WeakMap();
const enhancedStates = new Set();
let openState = null;
let nextSelectId = 1;

function optionLabel(select) {
    return select.selectedOptions?.[0]?.textContent?.trim() || "Select";
}

function applyOptionPreview(element, option) {
    const hasPreview = option?.dataset.previewStyle === "true";
    element.classList.toggle("has-style-preview", hasPreview);

    const previewProperties = {
        fontFamily: hasPreview && option.dataset.previewFontFamily
            ? `"${option.dataset.previewFontFamily}", serif`
            : "",
        color: hasPreview ? option.dataset.previewColor || "" : "",
        fontWeight: hasPreview ? option.dataset.previewFontWeight || "" : "",
        fontStyle: hasPreview ? option.dataset.previewFontStyle || "" : "",
        textDecoration: hasPreview ? option.dataset.previewTextDecoration || "" : "",
    };
    Object.assign(element.style, previewProperties);
    if (hasPreview && option.dataset.previewFontSize) {
        element.style.setProperty("--custom-select-preview-size", option.dataset.previewFontSize);
    } else {
        element.style.removeProperty("--custom-select-preview-size");
    }
}

function closeSelect(state, { restoreFocus = false } = {}) {
    if (!state || state.menu.hidden) return;
    state.menu.hidden = true;
    state.button.setAttribute("aria-expanded", "false");
    state.wrapper.classList.remove("is-open");
    if (openState === state) openState = null;
    if (restoreFocus) state.button.focus();
}

function positionMenu(state) {
    const rect = state.button.getBoundingClientRect();
    const gap = 6;
    const availableBelow = window.innerHeight - rect.bottom - gap - 12;
    const availableAbove = rect.top - gap - 12;
    const openAbove = availableBelow < 190 && availableAbove > availableBelow;
    const maximumHeight = Math.max(120, Math.min(300, openAbove ? availableAbove : availableBelow));

    state.menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
    state.menu.style.width = `${Math.max(rect.width, 120)}px`;
    state.menu.style.maxHeight = `${maximumHeight}px`;
    state.menu.style.top = openAbove ? "auto" : `${rect.bottom + gap}px`;
    state.menu.style.bottom = openAbove ? `${window.innerHeight - rect.top + gap}px` : "auto";
}

function buildOptions(state) {
    state.menu.replaceChildren();
    [...state.select.options].forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "custom-select-option";
        button.dataset.value = option.value;
        button.dataset.optionIndex = String(index);
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(option.selected));
        button.disabled = option.disabled;
        button.textContent = option.textContent;
        applyOptionPreview(button, option);
        if (option.dataset.fontFamily) {
            button.style.fontFamily = `"${option.dataset.fontFamily}", serif`;
        }
        if (option.dataset.action) {
            button.classList.add("is-action");
            if (index === 0 || !state.select.options[index - 1]?.dataset.action) {
                button.classList.add("is-action-start");
            }
        }
        button.addEventListener("click", () => {
            if (option.dataset.action) {
                closeSelect(state, { restoreFocus: true });
                state.select.dispatchEvent(new CustomEvent("custom-select-action", {
                    bubbles: true,
                    detail: { action: option.dataset.action },
                }));
                return;
            }
            state.select.value = option.value;
            state.select.dispatchEvent(new Event("change", { bubbles: true }));
            refreshCustomSelect(state.select);
            closeSelect(state, { restoreFocus: true });
        });
        state.menu.append(button);
    });
}

function openSelect(state) {
    if (state.select.disabled) return;
    if (openState && openState !== state) closeSelect(openState);
    buildOptions(state);
    state.menu.hidden = false;
    state.wrapper.classList.add("is-open");
    state.button.setAttribute("aria-expanded", "true");
    openState = state;
    positionMenu(state);
    const selectedOption = state.menu.querySelector('[aria-selected="true"]');
    if (selectedOption) {
        const selectedMiddle = selectedOption.offsetTop + selectedOption.offsetHeight / 2;
        state.menu.scrollTop = Math.max(0, selectedMiddle - state.menu.clientHeight / 2);
    }
}

function moveSelection(state, direction) {
    if (state.menu.hidden) openSelect(state);
    const options = [...state.menu.querySelectorAll(".custom-select-option:not(:disabled)")];
    if (!options.length) return;
    const focusedIndex = options.indexOf(document.activeElement);
    const selectedIndex = options.findIndex((option) => option.getAttribute("aria-selected") === "true");
    const start = focusedIndex >= 0 ? focusedIndex : Math.max(0, selectedIndex);
    options[(start + direction + options.length) % options.length].focus();
}

export function enhanceSelect(select) {
    if (!select || selectStates.has(select)) return selectStates.get(select);
    const wrapper = document.createElement("span");
    wrapper.className = "custom-select";
    const button = document.createElement("button");
    const menu = document.createElement("span");
    const id = `custom-select-${nextSelectId++}`;

    button.type = "button";
    button.className = "custom-select-trigger";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);
    button.setAttribute("aria-label", select.getAttribute("aria-label") || "Choose an option");
    menu.id = id;
    menu.className = "custom-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    select.before(wrapper);
    wrapper.append(button, select);
    (select.closest("dialog") || document.body).append(menu);
    select.classList.add("custom-select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const state = { select, wrapper, button, menu };
    selectStates.set(select, state);
    enhancedStates.add(state);
    button.addEventListener("click", () => {
        if (menu.hidden) openSelect(state);
        else closeSelect(state, { restoreFocus: true });
    });
    button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(state, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Escape") {
            closeSelect(state, { restoreFocus: true });
        }
    });
    menu.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(state, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Escape") {
            event.preventDefault();
            closeSelect(state, { restoreFocus: true });
        }
    });
    menu.addEventListener("pointerdown", (event) => event.stopPropagation());
    new MutationObserver(() => refreshCustomSelect(select)).observe(select, {
        attributes: true,
        childList: true,
        subtree: true,
    });
    refreshCustomSelect(select);
    return state;
}

export function refreshCustomSelect(select) {
    const state = selectStates.get(select);
    if (!state) return;
    state.button.disabled = select.disabled;
    state.button.textContent = optionLabel(select);
    applyOptionPreview(state.button, select.selectedOptions?.[0]);
    state.wrapper.classList.toggle("is-disabled", select.disabled);
    if (!state.menu.hidden) {
        buildOptions(state);
        positionMenu(state);
    }
}

export function enhanceAllSelects(root = document) {
    root.querySelectorAll("select").forEach(enhanceSelect);
}

if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", (event) => {
        const eventPath = event.composedPath?.() || [];
        if (
            openState
            && !eventPath.includes(openState.wrapper)
            && !eventPath.includes(openState.menu)
            && !openState.wrapper.contains(event.target)
            && !openState.menu.contains(event.target)
        ) {
            closeSelect(openState);
        }
    });
    window.addEventListener("resize", () => openState && positionMenu(openState));
    document.addEventListener("scroll", (event) => {
        if (!openState) return;
        if (event.target === openState.menu || openState.menu.contains(event.target)) return;
        closeSelect(openState);
    }, true);
}
