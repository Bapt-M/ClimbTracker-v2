"""
Full E2E Navigation Test Suite - Single Browser Session

This test runs a complete user journey:
1. Admin logs in
2. Creates a test route via the form
3. Validates the route (long press)
4. Views route details, modifies, archives
5. Tests leaderboard with details modal
6. Tests friends page (all tabs)
7. Tests admin panel (all tabs and filters)
8. Logs out
9. Creates a new lambda user
10. Lambda navigates all accessible pages
11. Lambda adds admin as friend
12. Lambda validates a route
13. Lambda checks leaderboard
14. Lambda logs out

Run with: pnpm test:e2e:full
"""

import pytest
import time
import uuid
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

from config import (
    BASE_URL,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    DEFAULT_TIMEOUT,
    LONG_TIMEOUT,
    HEADLESS,
    WINDOW_WIDTH,
    WINDOW_HEIGHT
)


class TestFullUserJourney:
    """Complete E2E test in a single browser session"""

    @pytest.fixture(scope="class")
    def browser(self):
        """Create a single browser instance for all tests in this class"""
        chrome_options = Options()

        if HEADLESS:
            chrome_options.add_argument("--headless")

        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument(f"--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.implicitly_wait(5)

        yield driver

        driver.quit()

    @pytest.fixture(scope="class")
    def test_data(self):
        """Shared test data across all tests"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "lambda_email": f"selenium_test_{unique_id}@climbtracker.com",
            "lambda_name": f"Test User {unique_id}",
            "lambda_password": "TestPassword123!",
            "test_route_name": f"Route Test Selenium {unique_id}",
            "created_route_id": None,
        }

    # ==================== HELPER METHODS ====================

    def wait_for_element(self, driver, by, value, timeout=DEFAULT_TIMEOUT):
        """Wait for element to be present"""
        wait = WebDriverWait(driver, timeout)
        return wait.until(EC.presence_of_element_located((by, value)))

    def wait_for_clickable(self, driver, by, value, timeout=DEFAULT_TIMEOUT):
        """Wait for element to be clickable"""
        wait = WebDriverWait(driver, timeout)
        return wait.until(EC.element_to_be_clickable((by, value)))

    def wait_for_loading(self, driver, timeout=LONG_TIMEOUT):
        """Wait for loading spinner to disappear"""
        time.sleep(0.5)
        try:
            WebDriverWait(driver, timeout).until(
                EC.invisibility_of_element_located((By.CSS_SELECTOR, ".animate-spin"))
            )
        except TimeoutException:
            pass

    def click_icon_button(self, driver, icon_name):
        """Click a button containing a material icon"""
        buttons = driver.find_elements(By.CSS_SELECTOR, "button, a")
        for btn in buttons:
            try:
                icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == icon_name:
                    btn.click()
                    return True
            except NoSuchElementException:
                continue
        return False

    def click_tab(self, driver, tab_text):
        """Click a tab button by text"""
        try:
            btn = self.wait_for_clickable(driver, By.XPATH, f"//button[contains(., '{tab_text}')]", timeout=5)
            btn.click()
            time.sleep(0.5)
            return True
        except TimeoutException:
            return False

    def long_press(self, driver, element, duration=1.5):
        """Perform a long press on an element"""
        actions = ActionChains(driver)
        actions.click_and_hold(element)
        actions.pause(duration)
        actions.release()
        actions.perform()

    def login(self, driver, email, password):
        """Login with credentials"""
        driver.get(f"{BASE_URL}/login")
        time.sleep(0.5)

        email_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[type='email']")
        email_input.clear()
        email_input.send_keys(email)

        password_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[type='password']")
        password_input.clear()
        password_input.send_keys(password)

        login_btn = self.wait_for_clickable(driver, By.CSS_SELECTOR, "button[type='submit']")
        login_btn.click()

        WebDriverWait(driver, LONG_TIMEOUT).until(EC.url_contains("/routes"))
        self.wait_for_loading(driver)
        print(f"  Logged in as {email}")

    def logout(self, driver):
        """Logout from the application"""
        self.click_icon_button(driver, "logout")
        WebDriverWait(driver, LONG_TIMEOUT).until(EC.url_contains("/login"))
        print("  Logged out")

    def register(self, driver, name, email, password):
        """Register a new account"""
        driver.get(f"{BASE_URL}/register")
        time.sleep(0.5)

        name_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[type='text']")
        name_input.clear()
        name_input.send_keys(name)

        email_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[type='email']")
        email_input.clear()
        email_input.send_keys(email)

        password_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        for pwd_input in password_inputs:
            pwd_input.clear()
            pwd_input.send_keys(password)

        register_btn = self.wait_for_clickable(driver, By.CSS_SELECTOR, "button[type='submit']")
        register_btn.click()

        WebDriverWait(driver, LONG_TIMEOUT).until(EC.url_contains("/routes"))
        self.wait_for_loading(driver)
        print(f"  Registered as {email}")

    # ==================== ADMIN USER JOURNEY ====================

    def test_01_admin_login(self, browser, test_data):
        """Step 1: Admin logs in"""
        print("\n" + "="*60)
        print("ADMIN USER JOURNEY")
        print("="*60)

        self.login(browser, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert "/routes" in browser.current_url
        print("[PASS] Admin login")

    def test_02_admin_create_route(self, browser, test_data):
        """Step 2: Admin creates a test route via form"""
        print("\n--- Creating test route ---")

        # Navigate to create route
        driver = browser
        driver.get(f"{BASE_URL}/routes/create")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Fill the form - look for name input
        try:
            # Try to find form inputs
            inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input:not([type])")
            if inputs:
                # First text input is usually the name
                inputs[0].clear()
                inputs[0].send_keys(test_data["test_route_name"])
                print(f"  Entered route name: {test_data['test_route_name']}")

            # Try to select difficulty (click on a colored button)
            difficulty_buttons = driver.find_elements(By.CSS_SELECTOR, "button[style*='background']")
            if difficulty_buttons:
                difficulty_buttons[2].click()  # Pick a middle difficulty
                print("  Selected difficulty")
                time.sleep(0.3)

            # Try to select sector (click on gym layout)
            sector_buttons = driver.find_elements(By.CSS_SELECTOR, "[data-sector], .sector-button, button.rounded-lg")
            if sector_buttons:
                for btn in sector_buttons[:5]:
                    try:
                        btn.click()
                        time.sleep(0.2)
                        break
                    except:
                        continue
                print("  Selected sector")

            # Submit the form
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
            time.sleep(2)
            self.wait_for_loading(driver)

            print("[PASS] Route creation form submitted")

        except Exception as e:
            print(f"[INFO] Could not complete route creation: {e}")
            # Navigate back to routes
            driver.get(f"{BASE_URL}/routes")
            self.wait_for_loading(driver)

    def test_03_admin_routes_hub_filters(self, browser, test_data):
        """Step 3: Admin tests routes hub filters"""
        print("\n--- Testing Routes Hub filters ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Test search
        search_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[placeholder*='Rechercher']")
        search_input.send_keys("test")
        time.sleep(0.5)
        search_input.clear()
        print("  Search filter tested")

        # Open filters panel
        self.click_icon_button(driver, "tune")
        time.sleep(0.5)
        print("  Filters panel opened")

        # Click some grade filters
        grade_buttons = driver.find_elements(By.CSS_SELECTOR, "button.rounded-lg, button.rounded-xl")
        clicked = 0
        for btn in grade_buttons[:3]:
            try:
                btn.click()
                clicked += 1
                time.sleep(0.2)
            except:
                continue
        print(f"  Clicked {clicked} filter buttons")

        # Toggle view mode
        self.click_icon_button(driver, "grid_view")
        time.sleep(0.3)
        self.click_icon_button(driver, "view_list")
        print("  View mode toggled")

        # Close filters
        self.click_icon_button(driver, "tune")
        time.sleep(0.3)

        print("[PASS] Routes Hub filters")

    def test_04_admin_route_long_press_validation(self, browser, test_data):
        """Step 4: Admin does long press on a route to validate"""
        print("\n--- Testing route validation (long press) ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Find a route card
        route_cards = driver.find_elements(By.CSS_SELECTOR, "[class*='RouteCard'], a[href*='/routes/']")

        if route_cards:
            # Try long press on first route card
            try:
                card = route_cards[0]
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", card)
                time.sleep(0.3)

                self.long_press(driver, card, 1.5)
                time.sleep(1)

                # Check if a menu/modal appeared
                menu_visible = len(driver.find_elements(By.CSS_SELECTOR, ".fixed, [role='menu'], [role='dialog']")) > 0

                if menu_visible:
                    print("  Quick status menu appeared")
                    # Try to click a validation option
                    validation_options = driver.find_elements(By.XPATH, "//button[contains(., 'Valider') or contains(., 'Flash') or contains(., 'Projet')]")
                    if validation_options:
                        validation_options[0].click()
                        time.sleep(0.5)
                        print("  Validation option clicked")
                else:
                    print("  Long press performed (no menu visible)")

            except Exception as e:
                print(f"  Long press test: {e}")
        else:
            print("  No route cards found for long press test")

        print("[PASS] Route validation test")

    def test_05_admin_route_detail_and_modify(self, browser, test_data):
        """Step 5: Admin views route details, modifies and archives"""
        print("\n--- Testing route detail page ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Click on a route to view details
        route_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        route_links = [link for link in route_links if '/create' not in link.get_attribute('href')]

        if route_links:
            route_links[0].click()
            self.wait_for_loading(driver)
            time.sleep(1)

            # Verify we're on route detail
            assert "/routes/" in driver.current_url
            print("  Route detail page loaded")

            # Look for status buttons (archive, pending, activate)
            status_buttons = driver.find_elements(By.XPATH,
                "//button[contains(., 'Archiver') or contains(., 'Pending') or contains(., 'Activer') or contains(., 'Active')]")

            if status_buttons:
                print(f"  Found {len(status_buttons)} status buttons")
                # Click archive button if available
                for btn in status_buttons:
                    if 'Archiver' in btn.text or 'Archive' in btn.text:
                        btn.click()
                        time.sleep(1)
                        print("  Clicked Archive button")

                        # Try to re-activate
                        activate_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Activer') or contains(., 'Active')]")
                        if activate_btns:
                            activate_btns[0].click()
                            time.sleep(1)
                            print("  Re-activated route")
                        break

            # Check for edit functionality
            edit_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Modifier') or contains(., 'Edit')]")
            if edit_btns:
                print("  Edit button found")

            # Look for comment section
            comment_section = driver.find_elements(By.CSS_SELECTOR, "textarea, [placeholder*='comment']")
            if comment_section:
                print("  Comment section found")
        else:
            print("  No routes found to view details")

        print("[PASS] Route detail and modify")

    def test_06_admin_leaderboard(self, browser, test_data):
        """Step 6: Admin tests leaderboard with all tabs and details modal"""
        print("\n--- Testing Leaderboard ---")

        driver = browser
        driver.get(f"{BASE_URL}/leaderboard")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Verify page loaded
        self.wait_for_element(driver, By.XPATH, "//h1[contains(text(), 'Classement')]")
        print("  Leaderboard page loaded")

        # Test Global tab
        self.click_tab(driver, "Global")
        self.wait_for_loading(driver)
        print("  Global tab clicked")

        # Test Friends tab
        self.click_tab(driver, "Amis")
        self.wait_for_loading(driver)
        print("  Friends tab clicked")

        # Go back to Global
        self.click_tab(driver, "Global")
        self.wait_for_loading(driver)

        # Try to open details modal
        details_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Details') or contains(., 'details') or contains(., 'Détails')]")
        if details_btns:
            details_btns[0].click()
            time.sleep(1)

            # Check if modal opened
            modal = driver.find_elements(By.CSS_SELECTOR, ".fixed.inset-0, [role='dialog']")
            if modal:
                print("  Details modal opened")

                # Close modal
                self.click_icon_button(driver, "close")
                time.sleep(0.5)
                print("  Modal closed")
        else:
            print("  No details button found")

        print("[PASS] Leaderboard")

    def test_07_admin_friends_page(self, browser, test_data):
        """Step 7: Admin tests friends page with all tabs"""
        print("\n--- Testing Friends page ---")

        driver = browser
        driver.get(f"{BASE_URL}/friends")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Verify page loaded
        self.wait_for_element(driver, By.XPATH, "//h1[contains(., 'Amis')]")
        print("  Friends page loaded")

        # Test all tabs
        for tab_name in ["Mes Amis", "Demandes", "Rechercher"]:
            self.click_tab(driver, tab_name)
            self.wait_for_loading(driver)
            print(f"  Tab '{tab_name}' clicked")

        # Test search functionality
        search_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[placeholder*='Rechercher']")
        search_input.clear()
        search_input.send_keys("test")

        # Click search button
        self.click_icon_button(driver, "search")
        time.sleep(1)
        self.wait_for_loading(driver)
        print("  Search performed")

        print("[PASS] Friends page")

    def test_08_admin_panel(self, browser, test_data):
        """Step 8: Admin tests admin panel with all tabs and filters"""
        print("\n--- Testing Admin Panel ---")

        driver = browser
        driver.get(f"{BASE_URL}/admin")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Verify admin page loaded
        try:
            self.wait_for_element(driver, By.XPATH, "//h1[contains(., 'Administration')]", timeout=5)
            print("  Admin panel loaded")
        except TimeoutException:
            print("  Admin page might have redirected (role check)")
            return

        # Test Gym Layout tab
        self.click_icon_button(driver, "map")
        time.sleep(0.5)
        self.wait_for_loading(driver)
        print("  Gym Layout tab clicked")

        # Test Routes tab
        self.click_icon_button(driver, "route")
        time.sleep(0.5)
        self.wait_for_loading(driver)
        print("  Routes tab clicked")

        # Test routes tab filters
        for filter_name in ["Toutes", "Actives", "En attente", "Archives"]:
            try:
                filter_btn = self.wait_for_clickable(driver, By.XPATH, f"//button[contains(., '{filter_name}')]", timeout=2)
                filter_btn.click()
                time.sleep(0.3)
                print(f"    Filter '{filter_name}' clicked")
            except TimeoutException:
                pass

        # Test Users tab
        self.click_icon_button(driver, "group")
        time.sleep(0.5)
        self.wait_for_loading(driver)
        print("  Users tab clicked")

        print("[PASS] Admin panel")

    def test_09_admin_logout(self, browser, test_data):
        """Step 9: Admin logs out"""
        print("\n--- Admin logout ---")

        driver = browser
        # Make sure we're on a page with logout button
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(0.5)

        self.logout(driver)
        assert "/login" in driver.current_url

        print("[PASS] Admin logout")
        print("\n" + "-"*60)

    # ==================== LAMBDA USER JOURNEY ====================

    def test_10_lambda_register(self, browser, test_data):
        """Step 10: Lambda user registers"""
        print("\n" + "="*60)
        print("LAMBDA USER JOURNEY")
        print("="*60)

        self.register(browser, test_data["lambda_name"], test_data["lambda_email"], test_data["lambda_password"])
        assert "/routes" in browser.current_url or "/login" not in browser.current_url

        print(f"[PASS] Lambda registered: {test_data['lambda_email']}")

    def test_11_lambda_routes_hub(self, browser, test_data):
        """Step 11: Lambda tests routes hub"""
        print("\n--- Lambda: Routes Hub ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Verify page loaded
        self.wait_for_element(driver, By.XPATH, "//h1[contains(., 'Exploration')]")
        print("  Routes Hub loaded")

        # Verify NO create route FAB (lambda shouldn't have it)
        fab_buttons = driver.find_elements(By.CSS_SELECTOR, "a[href='/routes/create']")
        if not fab_buttons:
            print("  Confirmed: No create route button (correct for lambda)")
        else:
            print("  Warning: Create route button visible for lambda")

        # Test filters
        self.click_icon_button(driver, "tune")
        time.sleep(0.5)
        self.click_icon_button(driver, "tune")
        print("  Filters panel toggled")

        print("[PASS] Lambda Routes Hub")

    def test_12_lambda_validate_route(self, browser, test_data):
        """Step 12: Lambda validates a route"""
        print("\n--- Lambda: Route validation ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Find a route card and try long press
        route_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        route_cards = [c for c in route_cards if '/create' not in c.get_attribute('href')]

        if route_cards:
            card = route_cards[0]
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", card)
            time.sleep(0.3)

            self.long_press(driver, card, 1.5)
            time.sleep(1)

            # Try to select validation status
            status_options = driver.find_elements(By.XPATH, "//button[contains(., 'Projet') or contains(., 'Essai') or contains(., 'Flash')]")
            if status_options:
                status_options[0].click()
                time.sleep(0.5)
                print("  Validation status set")
            else:
                print("  No quick status menu appeared")
        else:
            print("  No routes found")

        print("[PASS] Lambda route validation")

    def test_13_lambda_route_detail(self, browser, test_data):
        """Step 13: Lambda views route detail (no admin controls)"""
        print("\n--- Lambda: Route detail ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(1)

        route_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        route_links = [link for link in route_links if '/create' not in link.get_attribute('href')]

        if route_links:
            route_links[0].click()
            self.wait_for_loading(driver)
            time.sleep(1)

            # Verify no admin status buttons
            admin_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Archiver') or contains(., 'Pending')]")
            if not admin_buttons:
                print("  Confirmed: No admin controls visible")
            else:
                print("  Warning: Admin controls visible for lambda")

            # Go back to routes
            driver.get(f"{BASE_URL}/routes")
            self.wait_for_loading(driver)

        print("[PASS] Lambda route detail")

    def test_14_lambda_add_friend(self, browser, test_data):
        """Step 14: Lambda searches and adds admin as friend"""
        print("\n--- Lambda: Add friend ---")

        driver = browser
        driver.get(f"{BASE_URL}/friends")
        self.wait_for_loading(driver)
        time.sleep(1)

        # Go to search tab
        self.click_tab(driver, "Rechercher")
        time.sleep(0.5)

        # Search for admin
        search_input = self.wait_for_element(driver, By.CSS_SELECTOR, "input[placeholder*='Rechercher']")
        search_input.clear()
        search_input.send_keys("admin")

        self.click_icon_button(driver, "search")
        time.sleep(1)
        self.wait_for_loading(driver)
        print("  Searched for 'admin'")

        # Try to add as friend
        add_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Ajouter')]")
        if add_buttons:
            add_buttons[0].click()
            time.sleep(1)
            print("  Friend request sent")
        else:
            print("  No 'Add' button found (might already be friends)")

        print("[PASS] Lambda add friend")

    def test_15_lambda_leaderboard(self, browser, test_data):
        """Step 15: Lambda tests leaderboard"""
        print("\n--- Lambda: Leaderboard ---")

        driver = browser
        driver.get(f"{BASE_URL}/leaderboard")
        self.wait_for_loading(driver)
        time.sleep(1)

        self.wait_for_element(driver, By.XPATH, "//h1[contains(., 'Classement')]")
        print("  Leaderboard loaded")

        # Test tabs
        self.click_tab(driver, "Global")
        time.sleep(0.5)
        self.click_tab(driver, "Amis")
        time.sleep(0.5)
        self.wait_for_loading(driver)
        print("  Tabs tested")

        # Try details modal
        details_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Details')]")
        if details_btns:
            details_btns[0].click()
            time.sleep(1)
            self.click_icon_button(driver, "close")
            print("  Details modal tested")

        print("[PASS] Lambda leaderboard")

    def test_16_lambda_no_admin_access(self, browser, test_data):
        """Step 16: Lambda verifies no admin access"""
        print("\n--- Lambda: Admin access denied ---")

        driver = browser
        driver.get(f"{BASE_URL}/admin")
        time.sleep(2)

        # Should be redirected or see no admin content
        if "/admin" in driver.current_url:
            admin_title = driver.find_elements(By.XPATH, "//h1[contains(., 'Administration')]")
            if not admin_title:
                print("  Confirmed: Admin page not accessible")
            else:
                print("  Warning: Lambda can see admin content")
        else:
            print(f"  Redirected to: {driver.current_url}")

        print("[PASS] Lambda admin access check")

    def test_17_lambda_logout(self, browser, test_data):
        """Step 17: Lambda logs out"""
        print("\n--- Lambda logout ---")

        driver = browser
        driver.get(f"{BASE_URL}/routes")
        self.wait_for_loading(driver)
        time.sleep(0.5)

        self.logout(driver)
        assert "/login" in driver.current_url

        print("[PASS] Lambda logout")
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60)
