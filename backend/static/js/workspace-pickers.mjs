function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function exactDate(year, month, day) {
    const date = new Date(0);
    date.setHours(12, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day ? date : null;
}

export function parseTypedDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    const yearFirst = /^(\d{1,6})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
    if (yearFirst) {
        const date = exactDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
        return date ? dateKey(date) : null;
    }

    const monthFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{1,6})$/.exec(text);
    if (monthFirst) {
        const date = exactDate(Number(monthFirst[3]), Number(monthFirst[1]), Number(monthFirst[2]));
        return date ? dateKey(date) : null;
    }

    const written = /^([a-z]+)\s+(\d{1,2})(?:,)?\s+(\d{1,6})$/i.exec(text);
    if (written) {
        const monthNames = [
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december",
        ];
        const month = monthNames.findIndex((name) => name.startsWith(written[1].toLowerCase())) + 1;
        if (!month) return null;
        const date = exactDate(Number(written[3]), month, Number(written[2]));
        return date ? dateKey(date) : null;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : dateKey(parsed);
}

export function storyDateFromValue(value) {
    const normalized = parseTypedDate(value);
    if (!normalized) return null;
    const match = /^(\d{4,6})-(\d{2})-(\d{2})$/.exec(normalized);
    return match ? exactDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

const parseDate = storyDateFromValue;

function dateKey(date) {
    return [
        String(date.getFullYear()).padStart(4, "0"),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

export function formatPickerDate(value) {
    const date = parseDate(value);
    return date ? date.toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
    }) : "Choose a date";
}

export function formatPickerTime(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "Choose a time";
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
        .format(new Date(2020, 0, 1, Number(match[1]), Number(match[2])));
}

export function workspacePickerMarkup(field, value = "") {
    const name = escapeHtml(field.name);
    const currentValue = escapeHtml(value);
    const label = escapeHtml(field.label);
    const icon = field.type === "date" ? "calendar-days" : "clock";
    const display = field.type === "date" ? formatPickerDate(value) : formatPickerTime(value);
    const pickerType = field.type === "date" ? "date" : "time";
    const pickerControl = pickerType === "date"
        ? `<span class="workspace-date-entry">
                <input type="text" value="${currentValue}" placeholder="YYYY-MM-DD" inputmode="numeric"
                    autocomplete="off" spellcheck="false" aria-label="${label}" data-picker-date-text>
                <button class="workspace-picker-trigger" type="button" aria-label="Open ${label.toLowerCase()} calendar" aria-haspopup="dialog" aria-expanded="false">
                    <i class="fa-regular fa-calendar-days" aria-hidden="true"></i>
                </button>
            </span>`
        : `<button class="workspace-picker-trigger" type="button" aria-label="${label}" aria-haspopup="listbox" aria-expanded="false">
                <i class="fa-regular fa-${icon}" aria-hidden="true"></i>
                <span data-picker-display>${escapeHtml(display)}</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>`;
    return `<div class="workspace-field${field.wide ? " wide" : ""}">
        <span>${label}</span>
        <span class="workspace-picker" data-${pickerType}-picker>
            <input type="hidden" name="${name}" value="${currentValue}">
            ${pickerControl}
            <span class="workspace-picker-popover" data-picker-popover ${pickerType === "date" ? 'role="dialog"' : ""} hidden></span>
        </span>
    </div>`;
}

function calendarMarkup(cursor, selectedValue) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1, 12);
    const start = new Date(year, month, 1 - first.getDay(), 12);
    const today = dateKey(new Date());
    const firstOfMonth = dateKey(first);
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const keyboardFocus = selectedValue.startsWith(monthPrefix)
        ? selectedValue
        : (today.startsWith(monthPrefix) ? today : firstOfMonth);
    const days = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const value = dateKey(date);
        const classes = [
            "workspace-calendar-day",
            date.getMonth() !== month ? "is-outside" : "",
            value === today ? "is-today" : "",
            value === selectedValue ? "is-selected" : "",
        ].filter(Boolean).join(" ");
        return `<button class="${classes}" type="button" data-picker-date="${value}"
            aria-label="${escapeHtml(date.toLocaleDateString(undefined, { dateStyle: "full" }))}"
            aria-pressed="${value === selectedValue}" tabindex="${value === keyboardFocus ? "0" : "-1"}">${date.getDate()}</button>`;
    }).join("");
    const heading = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return `<span class="workspace-picker-heading">
            <button type="button" data-picker-previous aria-label="Previous month"><i class="fa-solid fa-chevron-left"></i></button>
            <strong>${escapeHtml(heading)}</strong>
            <button type="button" data-picker-next aria-label="Next month"><i class="fa-solid fa-chevron-right"></i></button>
        </span>
        <span class="workspace-picker-weekdays">${["S", "M", "T", "W", "T", "F", "S"].map((day) => `<b>${day}</b>`).join("")}</span>
        <span class="workspace-picker-calendar">${days}</span>
        <span class="workspace-picker-footer"><button type="button" data-picker-clear>Clear</button><button type="button" data-picker-today>Today</button></span>`;
}

function timeMarkup(selectedValue) {
    const options = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        options.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
    }
    if (/^\d{2}:\d{2}$/.test(selectedValue) && !options.includes(selectedValue)) {
        options.push(selectedValue);
        options.sort();
    }
    const keyboardFocus = selectedValue || "12:00";
    return `<span class="workspace-time-options" role="listbox">${options.map((value) => `
        <button type="button" role="option" data-picker-time="${value}"
            aria-selected="${value === selectedValue}" tabindex="${value === keyboardFocus ? "0" : "-1"}"
            class="${value === selectedValue ? "is-selected" : ""}">${escapeHtml(formatPickerTime(value))}</button>`).join("")}</span>
        <span class="workspace-picker-footer"><button type="button" data-picker-clear>Clear time</button><span>15 min intervals</span></span>`;
}

function setPickerOpen(picker, open) {
    const trigger = picker.querySelector(".workspace-picker-trigger");
    const popover = picker.workspacePickerPopover;
    popover.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    picker.classList.toggle("is-open", open);
    if (open && picker.matches("[data-time-picker]")) {
        requestAnimationFrame(() => {
            const options = popover.querySelector(".workspace-time-options");
            const selected = popover.querySelector('.is-selected, [tabindex="0"]');
            if (options && selected) {
                options.scrollTop = Math.max(0, selected.offsetTop - options.clientHeight / 2);
            }
        });
    }
}

function positionPicker(picker) {
    const trigger = picker.querySelector(".workspace-picker-trigger");
    const popover = picker.workspacePickerPopover;
    const rect = trigger.getBoundingClientRect();
    const gap = 7;
    const width = picker.matches("[data-date-picker]") ? 310 : 210;
    const estimatedHeight = picker.matches("[data-date-picker]") ? 345 : 290;
    const availableBelow = window.innerHeight - rect.bottom - gap - 10;
    const availableAbove = rect.top - gap - 10;
    const openAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;
    popover.style.width = `${Math.min(width, window.innerWidth - 24)}px`;
    popover.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    popover.style.top = openAbove ? "auto" : `${rect.bottom + gap}px`;
    popover.style.bottom = openAbove ? `${window.innerHeight - rect.top + gap}px` : "auto";
    popover.style.maxHeight = `${Math.max(80, openAbove ? availableAbove : availableBelow)}px`;
}

function setPickerValue(picker, value) {
    const input = picker.querySelector('input[type="hidden"]');
    input.value = value;
    const dateText = picker.querySelector("[data-picker-date-text]");
    const display = picker.querySelector("[data-picker-display]");
    if (dateText) {
        dateText.value = value;
        dateText.setCustomValidity("");
        dateText.removeAttribute("aria-invalid");
    }
    if (display) display.textContent = formatPickerTime(value);
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function enhanceWorkspacePickers(root) {
    const pickers = [...root.querySelectorAll("[data-date-picker], [data-time-picker]")];
    const closeOthers = (current = null) => pickers.forEach((picker) => {
        if (picker !== current) setPickerOpen(picker, false);
    });

    pickers.forEach((picker) => {
        const input = picker.querySelector('input[type="hidden"]');
        const dateText = picker.querySelector("[data-picker-date-text]");
        const trigger = picker.querySelector(".workspace-picker-trigger");
        const popover = picker.querySelector("[data-picker-popover]");
        picker.workspacePickerPopover = popover;
        popover.dataset.pickerType = picker.matches("[data-date-picker]") ? "date" : "time";
        root.append(popover);
        let cursor = parseDate(input.value) || new Date();
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);

        const render = () => {
            popover.innerHTML = picker.matches("[data-date-picker]")
                ? calendarMarkup(cursor, input.value)
                : timeMarkup(input.value);
        };
        const commitTypedDate = () => {
            if (!dateText) return true;
            const normalized = parseTypedDate(dateText.value);
            if (normalized === null) {
                dateText.setCustomValidity("Enter a valid date, such as 1842-05-04 or May 4, 1842.");
                dateText.setAttribute("aria-invalid", "true");
                return false;
            }
            setPickerValue(picker, normalized);
            const selected = parseDate(normalized);
            if (selected) cursor = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
            return true;
        };
        render();

        dateText?.addEventListener("input", () => {
            dateText.setCustomValidity("");
            dateText.removeAttribute("aria-invalid");
        });
        dateText?.addEventListener("change", commitTypedDate);
        dateText?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                if (commitTypedDate()) dateText.blur();
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                trigger.click();
            }
        });

        trigger.addEventListener("click", () => {
            const opening = popover.hidden;
            closeOthers(picker);
            if (opening) {
                commitTypedDate();
                render();
            }
            setPickerOpen(picker, opening);
            if (opening) positionPicker(picker);
        });
        trigger.addEventListener("keydown", (event) => {
            if (event.key === "Escape") setPickerOpen(picker, false);
            if ((event.key === "ArrowDown" || event.key === "Enter") && popover.hidden) {
                event.preventDefault();
                closeOthers(picker);
                render();
                setPickerOpen(picker, true);
                positionPicker(picker);
                requestAnimationFrame(() => popover.querySelector('[tabindex="0"]')?.focus());
            }
        });
        popover.addEventListener("click", (event) => {
            const dateButton = event.target.closest("[data-picker-date]");
            const timeButton = event.target.closest("[data-picker-time]");
            if (dateButton || timeButton) {
                setPickerValue(picker, dateButton?.dataset.pickerDate || timeButton?.dataset.pickerTime);
                setPickerOpen(picker, false);
                trigger.focus();
            } else if (event.target.closest("[data-picker-previous]")) {
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12);
                render();
            } else if (event.target.closest("[data-picker-next]")) {
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
                render();
            } else if (event.target.closest("[data-picker-today]")) {
                setPickerValue(picker, dateKey(new Date()));
                setPickerOpen(picker, false);
                trigger.focus();
            } else if (event.target.closest("[data-picker-clear]")) {
                setPickerValue(picker, "");
                setPickerOpen(picker, false);
                trigger.focus();
            }
        });
        popover.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setPickerOpen(picker, false);
                trigger.focus();
                return;
            }
            const options = [...popover.querySelectorAll("[data-picker-date], [data-picker-time]")];
            const index = options.indexOf(document.activeElement);
            const columns = picker.matches("[data-date-picker]") ? 7 : 1;
            const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key];
            if (movement && index >= 0) {
                event.preventDefault();
                options[Math.max(0, Math.min(options.length - 1, index + movement))]?.focus();
            }
        });
    });

    root.addEventListener("pointerdown", (event) => {
        const current = pickers.find((picker) => (
            picker.contains(event.target) || picker.workspacePickerPopover.contains(event.target)
        ));
        closeOthers(current);
    });
    root.querySelector("form")?.addEventListener("scroll", () => closeOthers(), { passive: true });
}
