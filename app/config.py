# File: app/config.py
import os
from helpers.ngc_key_helper import retrieve_key
from .utils.logger import logger

class Settings:
    DB_URL = os.getenv("DATABASE_URL", "sqlite:///benchmarks.db")
    NGC_API_KEY = retrieve_key()
    BASE_PORT = 8000
    NIM_FILE = "nim_list.txt"
    MAX_RETRIES = 5
    RETRY_DELAY = 2  # seconds

settings = Settings()

# File: app/__init__.py
from .config import settings

# File: app/utils/logger.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("benchmark-system")
