from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.analyze_route import router as analyze_router
from .routes.memory_route import router as memory_router

app = FastAPI(
    title="AI Code Review System",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(memory_router)


@app.get("/")
def home():
    return {"message": "AI Code Review System Running"}