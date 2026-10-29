from .base import *
from .base import env_list

DEBUG = True
# Frontend dev memanggil API lintas origin (localhost:3000 -> 127.0.0.1:8000).
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
