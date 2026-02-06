# ClimbTracker E2E Tests

Comprehensive Selenium end-to-end tests for ClimbTracker v2.

## Prerequisites

1. **Python 3.8+** installed
2. **Chrome browser** installed
3. **Application running** (both API and Web)

## Setup

```bash
# Navigate to e2e directory
cd e2e

# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

## Running the Application

Before running tests, make sure both the API and Web applications are running:

```bash
# In the project root directory
pnpm dev
```

This should start:
- API server on http://localhost:3000
- Web app on http://localhost:5173

## Running Tests

### Run All Tests
```bash
python run_tests.py
```

### Run Specific Test Suites
```bash
# Admin user tests only
python run_tests.py admin

# Lambda (standard) user tests only
python run_tests.py lambda

# Full navigation suite (recommended)
python run_tests.py full
```

### Headless Mode (for CI/CD)
```bash
python run_tests.py --headless
python run_tests.py full --headless
```

### Using pytest directly
```bash
# Run all tests with verbose output
pytest -v

# Run specific test file
pytest test_admin_navigation.py -v

# Run specific test
pytest test_admin_navigation.py::TestAdminNavigation::test_admin_login -v

# Generate HTML report
pytest --html=reports/report.html --self-contained-html
```

## Test Structure

```
e2e/
├── config.py                      # Configuration (URLs, credentials, timeouts)
├── conftest.py                    # Pytest fixtures
├── helpers.py                     # Helper classes for navigation/auth
├── run_tests.py                   # Test runner script
├── test_admin_navigation.py       # Admin user tests
├── test_lambda_user_navigation.py # Standard user tests
├── test_full_navigation.py        # Complete navigation suite
├── reports/                       # Generated test reports
└── screenshots/                   # Screenshots on failures
```

## Test Credentials

### Admin User
- Email: `admin@climbtracker.com`
- Password: `password123`

### Lambda User
- Created dynamically during tests with unique emails

## Test Coverage

### Admin User Tests
- Login/Logout
- Routes Hub (search, filters, view mode toggle)
- Route Detail (including status management)
- Route Creation
- Leaderboard (Global/Friends tabs, Details modal)
- Friends (all tabs: Friends, Requests, Search)
- Admin Panel (Gym Layout, Routes, Users tabs)
- User Profile

### Lambda User Tests
- Registration
- Login/Logout
- Routes Hub (all filters)
- Route Detail (without admin controls)
- Leaderboard (all tabs)
- Friends (all tabs)
- User Profile
- Verify admin pages are NOT accessible

## Configuration

Edit `config.py` to change:
- Base URLs
- Test credentials
- Timeouts
- Browser settings (headless mode, window size)

## Troubleshooting

### "Chrome not found"
Make sure Chrome is installed and updated.

### "Port already in use"
Make sure the application is running on the correct ports (3000 for API, 5173 for Web).

### Tests timing out
Increase `DEFAULT_TIMEOUT` in `config.py` or check if the application is responding.

### Login failures
Verify the admin account exists in the database with the correct credentials.
