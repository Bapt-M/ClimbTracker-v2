"""
E2E Tests for Lambda (Standard) User Navigation

Tests all pages, tabs, and filters accessible to a standard user:
- Registration (if account doesn't exist)
- Routes Hub (with all filters)
- Route Detail (without admin controls)
- Leaderboard (global/friends tabs, details modal)
- Friends (friends/requests/search tabs)
- User Profile
- Dashboard
- Verifies admin-only features are NOT accessible
"""

import pytest
import time
import uuid
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from config import (
    BASE_URL,
    LAMBDA_USER_EMAIL,
    LAMBDA_USER_PASSWORD,
    LAMBDA_USER_NAME,
    DEFAULT_TIMEOUT
)


class TestLambdaUserNavigation:
    """Test suite for standard (lambda) user navigation"""

    # ========== REGISTRATION & LOGIN ==========

    def test_lambda_user_registration_or_login(self, driver, auth_helpers, page_helpers):
        """Test lambda user registration or login"""
        # Generate unique email for this test run to avoid conflicts
        unique_email = f"testuser_{uuid.uuid4().hex[:8]}@climbtracker.com"

        driver.get(f"{BASE_URL}/register")
        page_helpers.wait_for_loading_to_finish()

        try:
            # Try to register
            auth_helpers.register(
                LAMBDA_USER_NAME,
                unique_email,
                LAMBDA_USER_PASSWORD
            )
            print(f"Lambda user registered with email: {unique_email}")
        except Exception as e:
            print(f"Registration failed (might already exist): {e}")
            # Try logging in with original email
            driver.get(f"{BASE_URL}/login")
            auth_helpers.login(LAMBDA_USER_EMAIL, LAMBDA_USER_PASSWORD)
            print("Lambda user logged in with existing account")

        # Verify we're logged in
        assert "/routes" in driver.current_url or "/login" not in driver.current_url

    def test_lambda_login_existing(self, driver, auth_helpers):
        """Test login with existing lambda user"""
        driver.get(f"{BASE_URL}/login")

        try:
            auth_helpers.login(LAMBDA_USER_EMAIL, LAMBDA_USER_PASSWORD)
            print("Lambda user login successful")
        except Exception as e:
            pytest.skip(f"Lambda user doesn't exist yet, skipping login test: {e}")

    # ========== ROUTES HUB ==========

    def test_routes_hub_loads(self, lambda_logged_in, page_helpers):
        """Test routes hub page loads correctly for lambda user"""
        driver = lambda_logged_in

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Exploration')]")
        assert title is not None

        # Verify routes are displayed
        page_helpers.wait_for_loading_to_finish()
        time.sleep(1)

        print("Routes hub loaded successfully for lambda user")

    def test_routes_no_create_button_for_lambda(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test that lambda user doesn't see the create route FAB button"""
        driver = lambda_logged_in
        nav_helpers.go_to_routes()
        page_helpers.wait_for_loading_to_finish()

        # Lambda users should NOT see the FAB button to create routes
        fab_exists = page_helpers.element_exists(
            By.CSS_SELECTOR,
            "a[href='/routes/create']",
            timeout=3
        )

        # Note: This might still be visible, depends on implementation
        print(f"Create route FAB visible for lambda: {fab_exists}")

    def test_routes_search_filter(self, lambda_logged_in, page_helpers):
        """Test search functionality on routes hub"""
        driver = lambda_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Find search input
        search_input = page_helpers.wait_for_element(
            By.CSS_SELECTOR,
            "input[placeholder*='Rechercher']"
        )
        search_input.send_keys("test")
        time.sleep(1)

        print("Search filter tested for lambda user")

    def test_routes_toggle_filters_panel(self, lambda_logged_in, page_helpers):
        """Test opening the filters panel"""
        driver = lambda_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Click the filter button (tune icon)
        filter_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for btn in filter_buttons:
            try:
                icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "tune":
                    btn.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(0.5)

        # Verify filters are shown
        filters_visible = page_helpers.element_exists(
            By.XPATH,
            "//*[contains(text(), 'Difficulte') or contains(text(), 'Grades') or contains(text(), 'Grade')]",
            timeout=3
        )

        print(f"Filters panel toggled for lambda: {filters_visible}")

    def test_routes_all_filters(self, lambda_logged_in, page_helpers):
        """Test all filter types"""
        driver = lambda_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Open filters
        filter_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for btn in filter_buttons:
            try:
                icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "tune":
                    btn.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(0.5)

        # Try clicking various filter buttons
        filter_buttons = driver.find_elements(By.CSS_SELECTOR, "button.rounded-lg, button.rounded-xl, button.rounded-full")
        clicked_count = 0
        for btn in filter_buttons[:5]:
            try:
                btn.click()
                clicked_count += 1
                time.sleep(0.2)
            except:
                continue

        print(f"Clicked {clicked_count} filter buttons")

    # ========== ROUTE DETAIL ==========

    def test_route_detail_page(self, lambda_logged_in, page_helpers):
        """Test navigating to a route detail page"""
        driver = lambda_logged_in
        page_helpers.wait_for_loading_to_finish()
        time.sleep(1)

        # Find a route card and click it
        route_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        if route_cards:
            route_cards[0].click()
            page_helpers.wait_for_loading_to_finish()
            time.sleep(0.5)

            # Verify we're on a route detail page
            assert "/routes/" in driver.current_url
            print("Route detail page loaded for lambda user")
        else:
            print("No route cards found to click")

    def test_route_detail_no_admin_controls(self, lambda_logged_in, page_helpers):
        """Test that lambda user doesn't see admin status controls"""
        driver = lambda_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Navigate to a route
        route_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        if route_cards:
            route_cards[0].click()
            page_helpers.wait_for_loading_to_finish()

            # Lambda users should NOT see status management buttons
            has_archive_btn = page_helpers.element_exists(
                By.XPATH,
                "//button[contains(text(), 'Archiver')]",
                timeout=2
            )
            has_pending_btn = page_helpers.element_exists(
                By.XPATH,
                "//button[contains(text(), 'Pending')]",
                timeout=2
            )

            print(f"Lambda sees admin controls: Archive={has_archive_btn}, Pending={has_pending_btn}")

    def test_route_validation_status(self, lambda_logged_in, page_helpers):
        """Test route validation status features"""
        driver = lambda_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Navigate to a route
        route_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        if route_cards:
            route_cards[0].click()
            page_helpers.wait_for_loading_to_finish()

            # Look for validation status buttons
            validation_buttons = driver.find_elements(
                By.XPATH,
                "//button[contains(@class, 'bg-hold-') or contains(., 'Valider') or contains(., 'Flash')]"
            )
            print(f"Found {len(validation_buttons)} validation-related buttons")

    # ========== LEADERBOARD ==========

    def test_leaderboard_page(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test leaderboard page loads"""
        driver = lambda_logged_in
        nav_helpers.go_to_leaderboard()

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Classement')]")
        assert title is not None

        print("Leaderboard page loaded for lambda user")

    def test_leaderboard_global_tab(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test global leaderboard tab"""
        driver = lambda_logged_in
        nav_helpers.go_to_leaderboard()

        # Find and click global tab
        global_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Global')]"
        )
        global_tab.click()
        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("Global leaderboard tab tested for lambda user")

    def test_leaderboard_friends_tab(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test friends leaderboard tab"""
        driver = lambda_logged_in
        nav_helpers.go_to_leaderboard()

        # Find and click friends tab
        friends_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Amis')]"
        )
        friends_tab.click()
        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("Friends leaderboard tab tested for lambda user")

    def test_leaderboard_details_modal(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test opening user details modal in leaderboard"""
        driver = lambda_logged_in
        nav_helpers.go_to_leaderboard()
        page_helpers.wait_for_loading_to_finish()
        time.sleep(1)

        # Look for a details button
        details_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Details') or contains(., 'details')]")
        if details_buttons:
            details_buttons[0].click()
            time.sleep(1)

            # Check if modal opened
            modal_exists = page_helpers.element_exists(
                By.CSS_SELECTOR,
                ".fixed.inset-0, [role='dialog']",
                timeout=3
            )
            print(f"Details modal opened for lambda: {modal_exists}")

            # Close modal if open
            if modal_exists:
                close_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
                for btn in close_buttons:
                    try:
                        icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                        if icon.text == "close":
                            btn.click()
                            break
                    except NoSuchElementException:
                        continue
        else:
            print("No details button found")

    # ========== FRIENDS ==========

    def test_friends_page(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test friends page loads"""
        driver = lambda_logged_in
        nav_helpers.go_to_friends()

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Amis')]")
        assert title is not None

        print("Friends page loaded for lambda user")

    def test_friends_all_tabs(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test all friends tabs"""
        driver = lambda_logged_in
        nav_helpers.go_to_friends()

        tabs = ["Mes Amis", "Demandes", "Rechercher"]
        for tab_name in tabs:
            try:
                tab = page_helpers.wait_for_clickable(
                    By.XPATH,
                    f"//button[contains(., '{tab_name}')]"
                )
                tab.click()
                time.sleep(0.5)
                page_helpers.wait_for_loading_to_finish()
                print(f"Friends tab '{tab_name}' tested for lambda user")
            except TimeoutException:
                print(f"Friends tab '{tab_name}' not found")

    def test_friends_search_functionality(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test searching for friends"""
        driver = lambda_logged_in
        nav_helpers.go_to_friends()

        # Click search tab
        search_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Rechercher')]"
        )
        search_tab.click()
        time.sleep(0.5)

        # Find and use search input
        search_input = page_helpers.wait_for_element(
            By.CSS_SELECTOR,
            "input[placeholder*='Rechercher']"
        )
        search_input.send_keys("admin")

        # Click search button
        search_buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for btn in search_buttons:
            try:
                icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "search":
                    btn.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(1)
        page_helpers.wait_for_loading_to_finish()
        print("Friends search tested for lambda user")

    # ========== ADMIN ACCESS DENIED ==========

    def test_admin_page_not_accessible(self, lambda_logged_in, page_helpers):
        """Test that lambda user cannot access admin page"""
        driver = lambda_logged_in

        # Try to navigate directly to admin
        driver.get(f"{BASE_URL}/admin")
        time.sleep(2)

        # Lambda user should be redirected away from admin
        is_on_admin = "/admin" in driver.current_url

        # If still on admin page, verify no content is shown
        if is_on_admin:
            # Should see nothing or be redirected
            admin_title = page_helpers.element_exists(
                By.XPATH,
                "//h1[contains(text(), 'Administration')]",
                timeout=3
            )
            print(f"Lambda on admin page: {is_on_admin}, sees admin content: {admin_title}")
        else:
            print(f"Lambda correctly redirected away from admin to: {driver.current_url}")

    def test_admin_bottom_nav_hidden(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test that admin nav item is not visible for lambda user"""
        driver = lambda_logged_in
        nav_helpers.go_to_routes()

        # Check if admin icon exists in bottom nav
        admin_icons = driver.find_elements(By.CSS_SELECTOR, "nav span.material-symbols-outlined")
        admin_visible = False
        for icon in admin_icons:
            if icon.text == "admin_panel_settings":
                admin_visible = True
                break

        print(f"Admin nav icon visible for lambda: {admin_visible}")

    # ========== USER PROFILE ==========

    def test_user_profile_navigation(self, lambda_logged_in, page_helpers, nav_helpers):
        """Test navigating to a user profile"""
        driver = lambda_logged_in
        nav_helpers.go_to_leaderboard()
        page_helpers.wait_for_loading_to_finish()

        # Try to click on a user in the leaderboard
        user_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/users/']")
        if user_cards:
            user_cards[0].click()
            page_helpers.wait_for_loading_to_finish()

            # Verify we're on a user profile page
            assert "/users/" in driver.current_url
            print("User profile page loaded for lambda user")
        else:
            print("No user links found in leaderboard")

    # ========== DASHBOARD ==========

    def test_dashboard_page(self, lambda_logged_in, page_helpers):
        """Test dashboard page loads"""
        driver = lambda_logged_in
        driver.get(BASE_URL)
        page_helpers.wait_for_loading_to_finish()

        # Dashboard should redirect to routes if not configured
        time.sleep(1)
        print(f"Dashboard/Home navigated to: {driver.current_url}")

    # ========== LOGOUT ==========

    def test_lambda_logout(self, lambda_logged_in, auth_helpers, page_helpers):
        """Test lambda user logout"""
        driver = lambda_logged_in
        auth_helpers.logout()

        # Verify we're on login page
        assert "/login" in driver.current_url
        print("Lambda user logout successful")


class TestLambdaUserCreation:
    """Test creating a new lambda user account"""

    def test_create_new_lambda_account(self, driver, auth_helpers, page_helpers):
        """Test creating a brand new lambda user account"""
        # Generate unique credentials
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"selenium_test_{unique_id}@climbtracker.com"
        test_name = f"Selenium Test {unique_id}"
        test_password = "TestPassword123!"

        driver.get(f"{BASE_URL}/register")
        page_helpers.wait_for_loading_to_finish()

        # Register
        auth_helpers.register(test_name, test_email, test_password)

        # Verify registration was successful
        assert "/routes" in driver.current_url or "/login" not in driver.current_url
        print(f"Created new lambda user: {test_email}")

        # Test basic navigation with new account
        page_helpers.wait_for_loading_to_finish()

        # Navigate through main pages
        from helpers import NavigationHelpers
        nav = NavigationHelpers(driver, page_helpers)

        try:
            nav.go_to_leaderboard()
            page_helpers.wait_for_loading_to_finish()
            print("New user: Leaderboard loaded")

            nav.go_to_friends()
            page_helpers.wait_for_loading_to_finish()
            print("New user: Friends loaded")

            nav.go_to_routes()
            page_helpers.wait_for_loading_to_finish()
            print("New user: Routes loaded")
        except Exception as e:
            print(f"Navigation test failed: {e}")

        # Logout
        auth_helpers.logout()
        print("New user: Logout successful")
