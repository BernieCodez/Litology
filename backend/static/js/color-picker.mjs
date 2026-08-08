const PICKER_COLORS = [
    "#14131f", "#536b45", "#d9825b", "#f2d0a4", "#c8d6af", "#8a8685",
    "#ffffff", "#fff8eb", "#ffeccc", "#b5523b", "#3972a8", "#76518f",
];

const pickerStates = new WeakMap();
let openState = null;

function expandHex(value) {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value || "").trim());
    if (!match) return null;
    return match[1].length === 3
        ? `#${[...match[1]].map((digit) => digit + digit).join("")}`.toLowerCase()
        : `#${match[1].toLowerCase()}`;
}

export function parseColorValue(value, fallback = "#14131f") {
    const hex = expandHex(value);
    if (hex) return { hex, opacity: 100 };
    const rgba = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i.exec(String(value || "").trim());
    if (rgba && rgba.slice(1, 4).every((part) => Number(part) <= 255)) {
        const channels = rgba.slice(1, 4).map(Number);
        return {
            hex: `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
            opacity: Math.round(Number(rgba[4]) * 100),
        };
    }
    return parseColorValue(fallback === value ? "#14131f" : fallback, "#14131f");
}

export function colorValue(hex, opacity = 100) {
    const safeHex = expandHex(hex) || "#14131f";
    const safeOpacity = Math.min(100, Math.max(0, Number(opacity) || 0));
    if (safeOpacity === 100) return safeHex;
    const channels = [1, 3, 5].map((index) => Number.parseInt(safeHex.slice(index, index + 2), 16));
    return `rgba(${channels.join(", ")}, ${Number((safeOpacity / 100).toFixed(2))})`;
}

export function hexToHsv(hex) {
    const safeHex = expandHex(hex) || "#14131f";
    const [red, green, blue] = [1, 3, 5]
        .map((index) => Number.parseInt(safeHex.slice(index, index + 2), 16) / 255);
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const delta = maximum - minimum;
    let hue = 0;
    if (delta) {
        if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
        else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
        else hue = 60 * ((red - green) / delta + 4);
    }
    return {
        hue: (hue + 360) % 360,
        saturation: maximum ? delta / maximum : 0,
        value: maximum,
    };
}

export function hsvToHex(hue, saturation, value) {
    const safeHue = ((Number(hue) % 360) + 360) % 360;
    const safeSaturation = Math.min(1, Math.max(0, Number(saturation) || 0));
    const safeValue = Math.min(1, Math.max(0, Number(value) || 0));
    const chroma = safeValue * safeSaturation;
    const secondary = chroma * (1 - Math.abs(((safeHue / 60) % 2) - 1));
    const match = safeValue - chroma;
    const channels = safeHue < 60 ? [chroma, secondary, 0]
        : safeHue < 120 ? [secondary, chroma, 0]
            : safeHue < 180 ? [0, chroma, secondary]
                : safeHue < 240 ? [0, secondary, chroma]
                    : safeHue < 300 ? [secondary, 0, chroma]
                        : [chroma, 0, secondary];
    return `#${channels.map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function positionMenu(state) {
    const rect = state.trigger.getBoundingClientRect();
    const gap = 7;
    const width = 252;
    const availableBelow = window.innerHeight - rect.bottom - gap - 10;
    const availableAbove = rect.top - gap - 10;
    const openAbove = availableBelow < 500 && availableAbove > availableBelow;
    state.menu.style.width = `${width}px`;
    state.menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    state.menu.style.top = openAbove ? "auto" : `${rect.bottom + gap}px`;
    state.menu.style.bottom = openAbove ? `${window.innerHeight - rect.top + gap}px` : "auto";
    state.menu.style.maxHeight = `${Math.max(100, openAbove ? availableAbove : availableBelow)}px`;
}

function closePicker(state, { restoreFocus = false } = {}) {
    if (!state || state.menu.hidden) return;
    state.menu.hidden = true;
    state.trigger.setAttribute("aria-expanded", "false");
    state.wrapper.classList.remove("is-open");
    if (openState === state) openState = null;
    if (restoreFocus) state.trigger.focus();
}

function syncState(state, value, { notify = false, hsvOverride = null } = {}) {
    const parsed = parseColorValue(value, state.input.value || "#14131f");
    const hsv = hsvOverride || hexToHsv(parsed.hex);
    const resolved = colorValue(parsed.hex, parsed.opacity);
    state.hue = hsv.hue;
    state.saturation = hsv.saturation;
    state.brightness = hsv.value;
    state.input.value = resolved;
    state.hexInput.value = parsed.hex;
    state.opacityInput.value = String(parsed.opacity);
    state.opacityOutput.textContent = `${parsed.opacity}%`;
    state.swatch.style.backgroundColor = resolved;
    state.preview.style.backgroundColor = resolved;
    state.wheel.style.setProperty("--color-wheel-brightness", String(hsv.value));
    const radians = hsv.hue * Math.PI / 180;
    state.wheelPointer.style.left = `${50 + Math.sin(radians) * hsv.saturation * 50}%`;
    state.wheelPointer.style.top = `${50 - Math.cos(radians) * hsv.saturation * 50}%`;
    state.wheel.setAttribute("aria-valuetext", `${Math.round(hsv.hue)} degree hue, ${Math.round(hsv.saturation * 100)}% saturation`);
    state.brightnessInput.value = String(Math.round(hsv.value * 100));
    state.brightnessOutput.textContent = `${Math.round(hsv.value * 100)}%`;
    state.valueLabel?.replaceChildren(parsed.hex.toUpperCase());
    state.menu.querySelectorAll("[data-picker-color]").forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.pickerColor === parsed.hex);
    });
    if (notify) state.input.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncDisabled(state) {
    state.trigger.disabled = state.input.disabled;
    state.wrapper.classList.toggle("is-disabled", state.input.disabled);
    if (state.input.disabled) closePicker(state);
}

function openPicker(state) {
    if (openState && openState !== state) closePicker(openState);
    state.menu.hidden = false;
    state.trigger.setAttribute("aria-expanded", "true");
    state.wrapper.classList.add("is-open");
    openState = state;
    positionMenu(state);
}

export function enhanceColorPicker(wrapper) {
    if (!wrapper || pickerStates.has(wrapper)) return pickerStates.get(wrapper);
    const trigger = wrapper.querySelector("[data-color-picker-trigger]");
    const input = wrapper.querySelector("[data-color-value]");
    const swatch = wrapper.querySelector("[data-color-swatch]");
    if (!trigger || !input || !swatch) return null;

    const menu = document.createElement("span");
    menu.className = "color-picker-menu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", wrapper.dataset.colorPickerLabel || "Color picker");
    menu.hidden = true;
    menu.innerHTML = `
        <span class="color-wheel" role="slider" tabindex="0" aria-label="Hue and saturation" data-color-wheel><i></i></span>
        <label class="color-picker-brightness"><span>Brightness</span><input type="range" min="0" max="100" step="1" value="100"><output>100%</output></label>
        <span class="color-picker-palette">${PICKER_COLORS.map((color) => `<button type="button" data-picker-color="${color}" style="--picker-color:${color}" aria-label="Use ${color}"></button>`).join("")}</span>
        <label class="color-picker-hex"><span>Hex</span><input type="text" value="#14131f" maxlength="7" spellcheck="false" autocomplete="off"></label>
        <label class="color-picker-opacity"><span>Opacity</span><input type="range" min="0" max="100" step="1" value="100"><output>100%</output></label>
        <span class="color-picker-preview"><i></i><span>Preview</span></span>`;
    (wrapper.closest("dialog") || document.body).append(menu);

    const state = {
        wrapper,
        trigger,
        input,
        swatch,
        menu,
        hexInput: menu.querySelector(".color-picker-hex input"),
        opacityInput: menu.querySelector('.color-picker-opacity input[type="range"]'),
        opacityOutput: menu.querySelector(".color-picker-opacity output"),
        preview: menu.querySelector(".color-picker-preview i"),
        wheel: menu.querySelector("[data-color-wheel]"),
        wheelPointer: menu.querySelector("[data-color-wheel] i"),
        brightnessInput: menu.querySelector('.color-picker-brightness input[type="range"]'),
        brightnessOutput: menu.querySelector(".color-picker-brightness output"),
        valueLabel: wrapper.querySelector("[data-color-picker-value-label]"),
    };
    pickerStates.set(wrapper, state);
    pickerStates.set(input, state);
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");

    trigger.addEventListener("click", () => menu.hidden ? openPicker(state) : closePicker(state, { restoreFocus: true }));
    const chooseFromWheel = (event) => {
        const rect = state.wheel.getBoundingClientRect();
        const radius = Math.min(rect.width, rect.height) / 2;
        const horizontal = event.clientX - rect.left - rect.width / 2;
        const vertical = event.clientY - rect.top - rect.height / 2;
        const hue = (Math.atan2(vertical, horizontal) * 180 / Math.PI + 90 + 360) % 360;
        const saturation = Math.min(1, Math.hypot(horizontal, vertical) / radius);
        const value = state.brightnessInput.value / 100;
        const hex = hsvToHex(hue, saturation, value);
        syncState(state, colorValue(hex, state.opacityInput.value), {
            notify: true,
            hsvOverride: { hue, saturation, value },
        });
    };
    state.wheel.addEventListener("pointerdown", (event) => {
        state.wheel.setPointerCapture(event.pointerId);
        chooseFromWheel(event);
    });
    state.wheel.addEventListener("pointermove", (event) => {
        if (state.wheel.hasPointerCapture(event.pointerId)) chooseFromWheel(event);
    });
    state.wheel.addEventListener("keydown", (event) => {
        const hueMovement = { ArrowLeft: -2, ArrowRight: 2 }[event.key];
        const saturationMovement = { ArrowDown: -0.02, ArrowUp: 0.02 }[event.key];
        if (hueMovement === undefined && saturationMovement === undefined) return;
        event.preventDefault();
        const hue = state.hue + (hueMovement || 0);
        const saturation = Math.min(1, Math.max(0, state.saturation + (saturationMovement || 0)));
        const value = state.brightnessInput.value / 100;
        const hex = hsvToHex(hue, saturation, value);
        syncState(state, colorValue(hex, state.opacityInput.value), {
            notify: true,
            hsvOverride: { hue: ((hue % 360) + 360) % 360, saturation, value },
        });
    });
    state.brightnessInput.addEventListener("input", () => {
        const value = state.brightnessInput.value / 100;
        const hex = hsvToHex(state.hue, state.saturation, value);
        syncState(state, colorValue(hex, state.opacityInput.value), {
            notify: true,
            hsvOverride: { hue: state.hue, saturation: state.saturation, value },
        });
    });
    menu.addEventListener("click", (event) => {
        const preset = event.target.closest("[data-picker-color]");
        if (preset) syncState(state, colorValue(preset.dataset.pickerColor, state.opacityInput.value), { notify: true });
    });
    state.hexInput.addEventListener("input", () => {
        const hex = expandHex(state.hexInput.value);
        state.hexInput.setAttribute("aria-invalid", String(!hex));
        if (hex) syncState(state, colorValue(hex, state.opacityInput.value), { notify: true });
    });
    state.opacityInput.addEventListener("input", () => {
        syncState(state, colorValue(state.hexInput.value, state.opacityInput.value), {
            notify: true,
            hsvOverride: { hue: state.hue, saturation: state.saturation, value: state.brightness },
        });
    });
    menu.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePicker(state, { restoreFocus: true });
        }
    });
    new MutationObserver(() => syncDisabled(state)).observe(input, {
        attributes: true,
        attributeFilter: ["disabled"],
    });
    syncState(state, input.value);
    syncDisabled(state);
    return state;
}

export function enhanceColorPickers(root = document) {
    root.querySelectorAll("[data-color-picker]").forEach(enhanceColorPicker);
}

export function setColorPickerValue(input, value) {
    const state = pickerStates.get(input);
    if (state) syncState(state, value);
    else if (input) input.value = value;
}

if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", (event) => {
        if (openState && !openState.wrapper.contains(event.target) && !openState.menu.contains(event.target)) {
            closePicker(openState);
        }
    });
    window.addEventListener("resize", () => openState && positionMenu(openState));
    document.addEventListener("scroll", (event) => {
        if (!openState || openState.menu.contains(event.target)) return;
        closePicker(openState);
    }, true);
}
