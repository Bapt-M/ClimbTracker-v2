#!/usr/bin/env python
"""
Script to run E2E Selenium tests for ClimbTracker

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py admin              # Run admin tests only
    python run_tests.py lambda             # Run lambda tests only
    python run_tests.py full               # Run full navigation suite
    python run_tests.py --headless         # Run in headless mode
"""

import subprocess
import sys
import os

def main():
    # Change to e2e directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Parse arguments
    args = sys.argv[1:]
    headless = "--headless" in args
    args = [a for a in args if a != "--headless"]

    # Determine which tests to run
    test_file = None
    if "admin" in args:
        test_file = "test_admin_navigation.py"
    elif "lambda" in args:
        test_file = "test_lambda_user_navigation.py"
    elif "full" in args:
        test_file = "test_full_navigation.py"

    # Set headless mode via environment
    if headless:
        os.environ["HEADLESS"] = "true"

    # Build pytest command
    cmd = ["python", "-m", "pytest"]

    if test_file:
        cmd.append(test_file)

    # Add common options
    cmd.extend([
        "-v",
        "--tb=short",
        "--html=reports/test_report.html",
        "--self-contained-html",
        "-x",  # Stop on first failure
    ])

    # Create reports directory
    os.makedirs("reports", exist_ok=True)
    os.makedirs("screenshots", exist_ok=True)

    print(f"Running: {' '.join(cmd)}")
    print("="*60)

    # Run tests
    result = subprocess.run(cmd)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
