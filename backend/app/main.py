from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

from app.database import engine, Base, get_db
from app.routes import auth, requests, imports, approval, treasury, statistics, notifications

# Создание таблиц при запуске
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создание таблиц при старте
    Base.metadata.create_all(bind=engine)
    yield
    # Очистка при завершении (если нужно)

# Создание приложения FastAPI
app = FastAPI(
    title="SARIZ API",
    description="Система согласования заявок",
    version="1.0.0",
    lifespan=lifespan
)

# Настройка CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение маршрутов
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(imports.router, prefix="/api/imports", tags=["Imports"])
app.include_router(approval.router, prefix="/api/approval", tags=["Approval"])
app.include_router(treasury.router, prefix="/api/treasury", tags=["Treasury"])
app.include_router(statistics.router, prefix="/api/statistics", tags=["Statistics"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])

@app.get("/")
async def root():
    return {"message": "SARIZ API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
