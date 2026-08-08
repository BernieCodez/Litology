from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import dashboard as dashboard_api
from app.pages import dashboard as dashboard_page

from app.api import editor as editor_api
from app.api import fonts as fonts_api
from app.api import projects as projects_api
from app.pages import editor as editor_page


app = FastAPI(
    title="Litology API",
    version="0.1"
)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(dashboard_api.router)
app.include_router(dashboard_page.router)
app.include_router(editor_api.router)
app.include_router(fonts_api.router)
app.include_router(projects_api.router)
app.include_router(editor_page.router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Litology"
    }
