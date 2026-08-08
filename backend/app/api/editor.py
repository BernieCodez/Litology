from fastapi import APIRouter

router = APIRouter(
    prefix="/api/editor",
    tags=["Editor"]
)


@router.get("/{project_id}")
def open_editor(project_id: int):

    return {
        "project_id": project_id,
        "tabs": [
            "book",
            "plot",
            "characters",
            "settings",
            "timeline",
            "miscellaneous"
        ]
    }
