export const PROJECT_NAME_STORAGE_KEY = "litology.projectNames";

export function cleanProjectName(name) {
    return String(name ?? "").trim().replace(/\s+/g, " ");
}

function comparableName(name) {
    return cleanProjectName(name).toLocaleLowerCase();
}

export function nextAvailableProjectName(requestedName, projectNames, currentProjectId) {
    const requested = cleanProjectName(requestedName);

    if (!requested) {
        return "";
    }

    const usedNames = Object.entries(projectNames)
        .filter(([projectId]) => String(projectId) !== String(currentProjectId))
        .map(([, name]) => cleanProjectName(name));
    const usedComparableNames = new Set(usedNames.map(comparableName));

    if (!usedComparableNames.has(comparableName(requested))) {
        return requested;
    }

    const numberedName = requested.match(/^(.*?)(?:\s+\((\d+)\))$/);
    const baseName = cleanProjectName(numberedName ? numberedName[1] : requested);
    const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const versionPattern = new RegExp(`^${escapedBaseName}(?: \\((\\d+)\\))?$`, "i");
    let highestVersion = 1;

    usedNames.forEach((name) => {
        const match = name.match(versionPattern);

        if (match) {
            highestVersion = Math.max(highestVersion, match[1] ? Number(match[1]) : 1);
        }
    });

    return `${baseName} (${highestVersion + 1})`;
}

export function loadProjectNames(defaultNames, storage = window.localStorage) {
    try {
        const savedNames = JSON.parse(storage.getItem(PROJECT_NAME_STORAGE_KEY) || "{}");
        return { ...defaultNames, ...savedNames };
    } catch {
        return { ...defaultNames };
    }
}

export function saveProjectNames(projectNames, storage = window.localStorage) {
    storage.setItem(PROJECT_NAME_STORAGE_KEY, JSON.stringify(projectNames));
}

export function projectDocumentPath(projectName, chapterNumber) {
    return `/api/projects/${encodeURIComponent(cleanProjectName(projectName))}/chapters/${encodeURIComponent(chapterNumber)}`;
}

export function projectChaptersPath(projectName) {
    return `/api/projects/${encodeURIComponent(cleanProjectName(projectName))}/chapters`;
}
