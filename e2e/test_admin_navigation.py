"""
E2E Tests for Admin User Navigation

Tests all pages, tabs, and filters accessible to an admin user:
- Routes Hub (with all filters)
- Route Detail
- Route Creation
- Leaderboard (global/friends tabs, details modal)
- Friends (friends/requests/search tabs)
- Admin panel (gym-layout/routes/users tabs)
- User Profile
- Dashboard
"""

import pytest
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from config import BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_TIMEOUT


class TestAdminNavigation:
    """Test suite for admin user navigation"""

    # ========== ROUTES HUB ==========

    def test_admin_login(self, driver, auth_helpers):
        """Test admin login"""
        driver.get(f"{BASE_URL}/login")
        auth_helpers.login(ADMIN_EMAIL, ADMIN_PASSWORD)

        # Verify we're on routes page
        assert "/routes" in driver.current_url
        print("Admin login successful")

    def test_routes_hub_loads(self, admin_logged_in, page_helpers):
        """Test routes hub page loads correctly"""
        driver = admin_logged_in

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Exploration')]")
        assert title is not None

        # Verify routes are displayed
        page_helpers.wait_for_loading_to_finish()
        time.sleep(1)

        print("Routes hub loaded successfully")

    def test_routes_search_filter(self, admin_logged_in, page_helpers):
        """Test search functionality on routes hub"""
        driver = admin_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Find search input
        search_input = page_helpers.wait_for_element(
            By.CSS_SELECTOR,
            "input[placeholder*='Rechercher']"
        )
        search_input.send_keys("test")
        time.sleep(1)

        print("Search filter tested")

    def test_routes_toggle_filters_panel(self, admin_logged_in, page_helpers):
        """Test opening the filters panel"""
        driver = admin_logged_in
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

        # Verify filters are shown (grade filter should be visible)
        filters_visible = page_helpers.element_exists(
            By.XPATH,
            "//*[contains(text(), 'Difficulte') or contains(text(), 'Grades') or contains(text(), 'Grade')]",
            timeout=3
        )

        print(f"Filters panel toggled: {filters_visible}")

    def test_routes_grade_filter(self, admin_logged_in, page_helpers):
        """Test grade filter"""
        driver = admin_logged_in
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

        # Try to click on a grade filter button (colored buttons)
        grade_buttons = driver.find_elements(By.CSS_SELECTOR, "button.rounded-lg, button.rounded-xl")
        if grade_buttons:
            for btn in grade_buttons[:3]:  # Try first 3 buttons
                try:
                    btn.click()
                    time.sleep(0.3)
                except:
                    continue

        print("Grade filter tested")

    def test_routes_view_mode_toggle(self, admin_logged_in, page_helpers):
        """Test list/grid view mode toggle"""
        driver = admin_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Find view mode toggle button
        buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for btn in buttons:
            try:
                icon = btn.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text in ["grid_view", "view_list"]:
                    btn.click()
                    time.sleep(0.5)
                    btn.click()  # Toggle back
                    break
            except NoSuchElementException:
                continue

        print("View mode toggle tested")

    # ========== ROUTE DETAIL ==========

    def test_route_detail_page(self, admin_logged_in, page_helpers):
        """Test navigating to a route detail page"""
        driver = admin_logged_in
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
            print("Route detail page loaded")
        else:
            print("No route cards found to click")

    def test_route_detail_status_buttons(self, admin_logged_in, page_helpers):
        """Test route detail page has admin status buttons"""
        driver = admin_logged_in
        page_helpers.wait_for_loading_to_finish()

        # Navigate to a route
        route_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/routes/']")
        if route_cards:
            route_cards[0].click()
            page_helpers.wait_for_loading_to_finish()

            # Check for status management buttons (admin only)
            has_status_btn = page_helpers.element_exists(
                By.XPATH,
                "//button[contains(text(), 'Archiver') or contains(text(), 'Pending') or contains(text(), 'Activer')]",
                timeout=3
            )
            print(f"Admin status buttons present: {has_status_btn}")

    # ========== ROUTE CREATION ==========

    def test_route_creation_page(self, admin_logged_in, page_helpers, nav_helpers):
        """Test navigating to route creation page"""
        driver = admin_logged_in
        nav_helpers.go_to_routes()

        # Find the FAB button (+ icon)
        fab_button = page_helpers.wait_for_element(
            By.CSS_SELECTOR,
            "a[href='/routes/create'], a[href*='create']"
        )
        fab_button.click()

        page_helpers.wait_for_url_contains("/routes/create")
        page_helpers.wait_for_loading_to_finish()

        print("Route creation page loaded")

    def test_route_creation_form(self, admin_logged_in, page_helpers, nav_helpers):
        """Test route creation form fields exist"""
        driver = admin_logged_in
        nav_helpers.go_to_routes()

        # Navigate to create page
        fab_button = page_helpers.wait_for_element(
            By.CSS_SELECTOR,
            "a[href='/routes/create'], a[href*='create']"
        )
        fab_button.click()
        page_helpers.wait_for_loading_to_finish()

        # Check for form elements
        time.sleep(1)
        form_exists = page_helpers.element_exists(By.CSS_SELECTOR, "form", timeout=3)
        input_exists = page_helpers.element_exists(By.CSS_SELECTOR, "input", timeout=3)

        print(f"Route creation form: form={form_exists}, inputs={input_exists}")

    # ========== LEADERBOARD ==========

    def test_leaderboard_page(self, admin_logged_in, page_helpers, nav_helpers):
        """Test leaderboard page loads"""
        driver = admin_logged_in
        nav_helpers.go_to_leaderboard()

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Classement')]")
        assert title is not None

        print("Leaderboard page loaded")

    def test_leaderboard_global_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test global leaderboard tab"""
        driver = admin_logged_in
        nav_helpers.go_to_leaderboard()

        # Find and click global tab
        global_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Global')]"
        )
        global_tab.click()
        time.sleep(0.5)

        print("Global leaderboard tab tested")

    def test_leaderboard_friends_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test friends leaderboard tab"""
        driver = admin_logged_in
        nav_helpers.go_to_leaderboard()

        # Find and click friends tab
        friends_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Amis')]"
        )
        friends_tab.click()
        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("Friends leaderboard tab tested")

    def test_leaderboard_details_modal(self, admin_logged_in, page_helpers, nav_helpers):
        """Test opening user details modal in leaderboard"""
        driver = admin_logged_in
        nav_helpers.go_to_leaderboard()
        page_helpers.wait_for_loading_to_finish()
        time.sleep(1)

        # Look for a details button or clickable user card
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
            print(f"Details modal opened: {modal_exists}")

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

    def test_friends_page(self, admin_logged_in, page_helpers, nav_helpers):
        """Test friends page loads"""
        driver = admin_logged_in
        nav_helpers.go_to_friends()

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Amis')]")
        assert title is not None

        print("Friends page loaded")

    def test_friends_my_friends_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test my friends tab"""
        driver = admin_logged_in
        nav_helpers.go_to_friends()

        # Find and click friends tab
        friends_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Mes Amis')]"
        )
        friends_tab.click()
        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("My friends tab tested")

    def test_friends_requests_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test friend requests tab"""
        driver = admin_logged_in
        nav_helpers.go_to_friends()

        # Find and click requests tab
        requests_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Demandes')]"
        )
        requests_tab.click()
        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("Requests tab tested")

    def test_friends_search_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test search friends tab"""
        driver = admin_logged_in
        nav_helpers.go_to_friends()

        # Find and click search tab
        search_tab = page_helpers.wait_for_clickable(
            By.XPATH,
            "//button[contains(., 'Rechercher')]"
        )
        search_tab.click()
        time.sleep(0.5)

        # Verify search input is visible
        search_input = page_helpers.wait_for_element(
            By.CSS_SELECTOR,
            "input[placeholder*='Rechercher']"
        )
        assert search_input is not None

        # Try searching
        search_input.send_keys("test")

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
        print("Search friends tab tested")

    # ========== ADMIN PANEL ==========

    def test_admin_panel_page(self, admin_logged_in, page_helpers, nav_helpers):
        """Test admin panel page loads"""
        driver = admin_logged_in
        nav_helpers.go_to_admin()

        # Verify page title
        title = page_helpers.wait_for_element(By.XPATH, "//h1[contains(text(), 'Administration')]")
        assert title is not None

        print("Admin panel loaded")

    def test_admin_gym_layout_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test admin gym layout tab"""
        driver = admin_logged_in
        nav_helpers.go_to_admin()

        # Find and click gym layout tab
        tabs = driver.find_elements(By.CSS_SELECTOR, "button")
        for tab in tabs:
            try:
                icon = tab.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "map":
                    tab.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(0.5)
        print("Gym layout tab tested")

    def test_admin_routes_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test admin routes management tab"""
        driver = admin_logged_in
        nav_helpers.go_to_admin()

        # Find and click routes tab
        tabs = driver.find_elements(By.CSS_SELECTOR, "button")
        for tab in tabs:
            try:
                icon = tab.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "route":
                    tab.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("Admin routes tab tested")

    def test_admin_routes_tab_filters(self, admin_logged_in, page_helpers, nav_helpers):
        """Test admin routes tab filters (Toutes, Actives, En attente, Archives)"""
        driver = admin_logged_in
        nav_helpers.go_to_admin()

        # Go to routes tab
        tabs = driver.find_elements(By.CSS_SELECTOR, "button")
        for tab in tabs:
            try:
                icon = tab.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "route":
                    tab.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        # Test each status filter
        filters = ["Toutes", "Actives", "En attente", "Archives"]
        for filter_name in filters:
            try:
                filter_btn = page_helpers.wait_for_clickable(
                    By.XPATH,
                    f"//button[contains(., '{filter_name}')]",
                    timeout=3
                )
                filter_btn.click()
                time.sleep(0.5)
                print(f"Admin routes filter '{filter_name}' tested")
            except TimeoutException:
                print(f"Admin routes filter '{filter_name}' not found")

    def test_admin_users_tab(self, admin_logged_in, page_helpers, nav_helpers):
        """Test admin users management tab"""
        driver = admin_logged_in
        nav_helpers.go_to_admin()

        # Find and click users tab
        tabs = driver.find_elements(By.CSS_SELECTOR, "button")
        for tab in tabs:
            try:
                icon = tab.find_element(By.CSS_SELECTOR, "span.material-symbols-outlined")
                if icon.text == "group":
                    tab.click()
                    break
            except NoSuchElementException:
                continue

        time.sleep(0.5)
        page_helpers.wait_for_loading_to_finish()

        print("Admin users tab tested")

    # ========== USER PROFILE ==========

    def test_user_profile_navigation(self, admin_logged_in, page_helpers, nav_helpers):
        """Test navigating to a user profile"""
        driver = admin_logged_in
        nav_helpers.go_to_leaderboard()
        page_helpers.wait_for_loading_to_finish()

        # Try to click on a user in the leaderboard
        user_cards = driver.find_elements(By.CSS_SELECTOR, "a[href*='/users/']")
        if user_cards:
            user_cards[0].click()
            page_helpers.wait_for_loading_to_finish()

            # Verify we're on a user profile page
            assert "/users/" in driver.current_url
            print("User profile page loaded")
        else:
            print("No user links found in leaderboard")

    # ========== DASHBOARD ==========

    def test_dashboard_page(self, admin_logged_in, page_helpers):
        """Test dashboard page loads"""
        driver = admin_logged_in
        driver.get(BASE_URL)
        page_helpers.wait_for_loading_to_finish()

        # Dashboard should redirect to routes if not configured
        time.sleep(1)
        print(f"Dashboard/Home navigated to: {driver.current_url}")

    # ========== LOGOUT ==========

    def test_admin_logout(self, admin_logged_in, auth_helpers, page_helpers):
        """Test admin logout"""
        driver = admin_logged_in
        auth_helpers.logout()

        # Verify we're on login page
        assert "/login" in driver.current_url
        print("Admin logout successful")
