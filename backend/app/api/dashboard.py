from fastapi import APIRouter

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard API"]
)


@router.get("/")
def get_dashboard():

    return {
        "message": "Hello from FastAPI!"
    }