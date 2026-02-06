"""Pytest fixtures and configuration for E2E tests"""

import pytest
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

from config import BASE_URL, HEADLESS, WINDOW_WIDTH, WINDOW_HEIGHT
from helpers import PageHelpers, AuthHelpers, NavigationHelpers


# Create screenshots directory if it doesn't exist
os.makedirs("screenshots", exist_ok=True)


@pytest.fixture(scope="function")
def driver():
    """Create a Chrome WebDriver instance"""
    chrome_options = Options()

    if HEADLESS:
        chrome_options.add_argument("--headless")

    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument(f"--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-extensions")

    # Create driver using webdriver-manager
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    # Set implicit wait
    driver.implicitly_wait(5)

    # Navigate to base URL
    driver.get(BASE_URL)

    yield driver

    # Cleanup
    driver.quit()


@pytest.fixture(scope="function")
def page_helpers(driver):
    """Create PageHelpers instance"""
    return PageHelpers(driver)


@pytest.fixture(scope="function")
def auth_helpers(driver, page_helpers):
    """Create AuthHelpers instance"""
    return AuthHelpers(driver, page_helpers)


@pytest.fixture(scope="function")
def nav_helpers(driver, page_helpers):
    """Create NavigationHelpers instance"""
    return NavigationHelpers(driver, page_helpers)


@pytest.fixture(scope="function")
def admin_logged_in(driver, page_helpers, auth_helpers):
    """Login as admin user"""
    from config import ADMIN_EMAIL, ADMIN_PASSWORD

    driver.get(f"{BASE_URL}/login")
    auth_helpers.login(ADMIN_EMAIL, ADMIN_PASSWORD)

    return driver


@pytest.fixture(scope="function")
def lambda_logged_in(driver, page_helpers, auth_helpers):
    """Login or register as lambda user"""
    from config import LAMBDA_USER_EMAIL, LAMBDA_USER_PASSWORD, LAMBDA_USER_NAME

    driver.get(f"{BASE_URL}/login")

    # Try to login first
    try:
        auth_helpers.login(LAMBDA_USER_EMAIL, LAMBDA_USER_PASSWORD)
    except Exception:
        # If login fails, register new account
        driver.get(f"{BASE_URL}/register")
        auth_helpers.register(LAMBDA_USER_NAME, LAMBDA_USER_EMAIL, LAMBDA_USER_PASSWORD)

    return driver
