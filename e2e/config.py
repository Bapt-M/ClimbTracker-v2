"""Configuration for E2E tests"""
import os

# Base URLs
BASE_URL = os.environ.get("BASE_URL", "http://localhost:5173")
API_URL = os.environ.get("API_URL", "http://localhost:3000")

# Test credentials
ADMIN_EMAIL = "admin@climbtracker.com"
ADMIN_PASSWORD = "password123"

# Lambda user credentials (will be created during tests)
LAMBDA_USER_EMAIL = "testuser_lambda@climbtracker.com"
LAMBDA_USER_PASSWORD = "TestPassword123!"
LAMBDA_USER_NAME = "Test Lambda User"

# Timeouts
DEFAULT_TIMEOUT = 10
LONG_TIMEOUT = 20
SHORT_TIMEOUT = 5

# Browser settings - read from environment for CI/CD
HEADLESS = os.environ.get("HEADLESS", "").lower() in ("true", "1", "yes")
WINDOW_WIDTH = 430  # Mobile-like width (max-w-md)
WINDOW_HEIGHT = 932
