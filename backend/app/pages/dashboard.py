from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.templates import templates


router = APIRouter(
    tags=["Pages"]
)


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pages/dashboard.html",
        context={}
    )