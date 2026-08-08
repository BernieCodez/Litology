from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.templates import templates


router = APIRouter(
    tags=["Pages"]
)

PROJECTS = {
    101: {"name": "The House That Kept the Rain", "type": "Novel"},
    102: {"name": "The Orchard at Dusk", "type": "Novel"},
    201: {"name": "Things the Morning Kept", "type": "Poetry"},
    202: {"name": "Memory, Maps & Meaning", "type": "Research essay"},
}


def render_editor(request: Request, project_id: str, project: dict[str, str]):
    project_names = {
        str(existing_id): existing_project["name"]
        for existing_id, existing_project in PROJECTS.items()
    }
    project_names[project_id] = project["name"]

    return templates.TemplateResponse(
        request=request,
        name="pages/editor.html",
        context={
            "project_id": project_id,
            "project_name": project["name"],
            "project_type": project["type"],
            "project_names": project_names,
        }
    )


@router.get("/editor", response_class=HTMLResponse)
def editor(request: Request):
    return render_editor(
        request,
        project_id="draft",
        project={"name": "Untitled Project", "type": "Manuscript"},
    )


@router.get("/editor/{project_id}", response_class=HTMLResponse)
def project_editor(request: Request, project_id: int):
    project = PROJECTS.get(
        project_id,
        {"name": "Untitled Project", "type": "Manuscript"},
    )
    return render_editor(request, str(project_id), project)
