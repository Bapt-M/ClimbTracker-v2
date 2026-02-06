"""Helper functions for E2E tests"""

import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from config import DEFAULT_TIMEOUT, LONG_TIMEOUT, SHORT_TIMEOUT


class PageHelpers:
    """Helper class for common page operations"""

    def __init__(self, driver):
        self.driver = driver

    def wait_for_element(self, by, value, timeout=DEFAULT_TIMEOUT):
        """Wait for an element to be present and return it"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.presence_of_element_located((by, value)))

    def wait_for_clickable(self, by, value, timeout=DEFAULT_TIMEOUT):
        """Wait for an element to be clickable and return it"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.element_to_be_clickable((by, value)))

    def wait_for_elements(self, by, value, timeout=DEFAULT_TIMEOUT):
        """Wait for multiple elements to be present"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.presence_of_all_elements_located((by, value)))

    def wait_for_url_contains(self, text, timeout=DEFAULT_TIMEOUT):
        """Wait for URL to contain specific text"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.url_contains(text))

    def wait_for_loading_to_finish(self, timeout=LONG_TIMEOUT):
        """Wait for loading spinner to disappear"""
        try:
            # Wait for spinner to appear first (if it does)
            WebDriverWait(self.driver, 2).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".animate-spin"))
            )
        except TimeoutException:
            # Spinner didn't appear, page might have loaded quickly
            pass

        # Wait for spinner to disappear
        wait = WebDriverWait(self.driver, timeout)
        try:
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".animate-spin")))
        except TimeoutException:
            pass

    def click_element(self, by, value, timeout=DEFAULT_TIMEOUT):
        """Wait for element and click it"""
        element = self.wait_for_clickable(by, value, timeout)
        element.click()
        return element

    def type_text(self, by, value, text, clear=True, timeout=DEFAULT_TIMEOUT):
        """Wait for input and type text"""
        element = self.wait_for_element(by, value, timeout)
        if clear:
            element.clear()
        element.send_keys(text)
        return element

    def element_exists(self, by, value, timeout=SHORT_TIMEOUT):
        """Check if an element exists"""
        try:
            self.wait_for_element(by, value, timeout)
            return True
        except TimeoutException:
            return False

    def get_text(self, by, value, timeout=DEFAULT_TIMEOUT):
        """Get text from an element"""
        element = self.wait_for_element(by, value, timeout)
        return element.text

    def scroll_to_element(self, element):
        """Scroll element into view"""
        self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
        time.sleep(0.3)

    def take_screenshot(self, name):
        """Take a screenshot"""
        self.driver.save_screenshot(f"screenshots/{name}.png")


class AuthHelpers:
    """Helper class for authentication operations"""

    def __init__(self, driver, page_helpers):
        self.driver = driver
        self.helpers = page_helpers

    def login(self, email, password):
        """Login with email and password"""
        from config import BASE_URL
        # Navigate to login page
        self.driver.get(f"{BASE_URL}/login")

        # Wait for login form to load
        time.sleep(0.5)

        # Find and fill email input
        email_input = self.helpers.wait_for_element(By.CSS_SELECTOR, "input[type='email']")
        email_input.clear()
        email_input.send_keys(email)

        # Find and fill password input
        password_input = self.helpers.wait_for_element(By.CSS_SELECTOR, "input[type='password']")
        password_input.clear()
        password_input.send_keys(password)

        # Click login button
        login_btn = self.helpers.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")
        login_btn.click()

        # Wait for redirect to routes page
        self.helpers.wait_for_url_contains("/routes", timeout=LONG_TIMEOUT)
        self.helpers.wait_for_loading_to_finish()

        print(f"Logged in successfully as {email}")

    def logout(self):
        """Logout from the application"""
        # Find and click logout button
        logout_btn = self.helpers.wait_for_clickable(
            By.CSS_SELECTOR,
            "button span.material-symbols-outlined"
        )
        # Find the button with logout icon
        logout_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button")
        for btn in logout_buttons:
            try:
                icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "logout":
                    btn.click()
                    break
            except NoSuchElementException:
                continue

        # Wait for redirect to login page
        self.helpers.wait_for_url_contains("/login", timeout=LONG_TIMEOUT)

        print("Logged out successfully")

    def register(self, name, email, password):
        """Register a new account"""
        # Navigate to register page
        from config import BASE_URL
        self.driver.get(f"{BASE_URL}/register")

        # Wait for register form to load
        time.sleep(0.5)

        # Find and fill name input
        name_input = self.helpers.wait_for_element(By.CSS_SELECTOR, "input[type='text']")
        name_input.clear()
        name_input.send_keys(name)

        # Find and fill email input
        email_input = self.helpers.wait_for_element(By.CSS_SELECTOR, "input[type='email']")
        email_input.clear()
        email_input.send_keys(email)

        # Find and fill password inputs
        password_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        for pwd_input in password_inputs:
            pwd_input.clear()
            pwd_input.send_keys(password)

        # Click register button
        register_btn = self.helpers.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")
        register_btn.click()

        # Wait for redirect to routes page
        self.helpers.wait_for_url_contains("/routes", timeout=LONG_TIMEOUT)
        self.helpers.wait_for_loading_to_finish()

        print(f"Registered and logged in as {email}")


class NavigationHelpers:
    """Helper class for navigation operations"""

    def __init__(self, driver, page_helpers):
        self.driver = driver
        self.helpers = page_helpers

    def go_to_routes(self):
        """Navigate to routes hub"""
        from config import BASE_URL
        self.driver.get(f"{BASE_URL}/routes")
        self.helpers.wait_for_loading_to_finish()
        print("Navigated to Routes Hub")

    def go_to_leaderboard(self):
        """Navigate to leaderboard"""
        from config import BASE_URL
        self.driver.get(f"{BASE_URL}/leaderboard")
        self.helpers.wait_for_loading_to_finish()
        print("Navigated to Leaderboard")

    def go_to_friends(self):
        """Navigate to friends page"""
        from config import BASE_URL
        self.driver.get(f"{BASE_URL}/friends")
        self.helpers.wait_for_loading_to_finish()
        print("Navigated to Friends")

    def go_to_admin(self):
        """Navigate to admin page (admin only)"""
        from config import BASE_URL
        self.driver.get(f"{BASE_URL}/admin")
        self.helpers.wait_for_loading_to_finish()
        print("Navigated to Admin")

    def go_to_dashboard(self):
        """Navigate to dashboard"""
        from config import BASE_URL
        self.driver.get(BASE_URL)
        self.helpers.wait_for_loading_to_finish()
        print("Navigated to Dashboard")

    def click_bottom_nav(self, icon_name):
        """Click a bottom navigation item by icon name"""
        nav_items = self.driver.find_elements(By.CSS_SELECTOR, "nav button, nav a")
        for item in nav_items:
            try:
                icon = item.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == icon_name:
                    self.helpers.scroll_to_element(item)
                    item.click()
                    time.sleep(0.5)
                    return
            except NoSuchElementException:
                continue
        raise Exception(f"Bottom nav item with icon '{icon_name}' not found")
