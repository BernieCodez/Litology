import { loadProjectNames } from "/static/js/project-names.mjs";

const projectNames = loadProjectNames({});

document.querySelectorAll("[data-project-id]").forEach((projectCard) => {
    const savedName = projectNames[projectCard.dataset.projectId];
    const title = projectCard.querySelector("h3");

    if (savedName && title) {
        title.textContent = savedName;
    }
});

async function loadDashboard(){
    const response = await fetch(
        "/api/dashboard/"
    );

    const data = await response.json();

    console.log(data);

}

loadDashboard();
