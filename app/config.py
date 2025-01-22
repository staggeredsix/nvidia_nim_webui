# File: app/config.py
import os
import logging
from app.utils.ngc_key_helper import retrieve_key

# Set up basic logging before importing other modules
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

class Settings:
    BASE_PORT = 8000
    NIM_FILE = "nim_list.txt"
    MAX_RETRIES = 5
    RETRY_DELAY = 2  # seconds
    NGC_API_KEY = None

    def __init__(self):
        # Get NGC key lazily to avoid circular imports
        self._setup_ngc_key()

    def _setup_ngc_key(self):
        try:
            self.NGC_API_KEY = retrieve_key()
        except Exception as e:
            logging.error(f"Failed to retrieve NGC key: {e}")
            self.NGC_API_KEY = None

settings = Settings()