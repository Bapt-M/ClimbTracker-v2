#!/usr/bin/env node
/**
 * ClimbTracker E2E Selenium Test Runner
 *
 * Usage:
 *   pnpm test:e2e --full      Run full test suite
 *   pnpm test:e2e --admin     Run admin tests only
 *   pnpm test:e2e --lambda    Run lambda user tests only
 *   pnpm test:e2e --headless  Run in headless mode
 *
 * This script:
 * 1. Creates a Python virtual environment
 * 2. Installs dependencies
 * 3. Runs the specified tests
 * 4. Generates an HTML report
 * 5. Cleans up (removes venv and test artifacts)
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse arguments
const args = process.argv.slice(2);
let testType = 'full'; // default
let headless = false;
let keepVenv = false;

args.forEach(arg => {
  if (arg === '--full') testType = 'full';
  else if (arg === '--admin') testType = 'admin';
  else if (arg === '--lambda') testType = 'lambda';
  else if (arg === '--headless') headless = true;
  else if (arg === '--keep-venv') keepVenv = true;
});

// Paths
const projectRoot = path.resolve(__dirname, '..');
const e2eDir = path.join(projectRoot, 'e2e');
const venvDir = path.join(e2eDir, 'venv');
const reportsDir = path.join(e2eDir, 'reports');
const screenshotsDir = path.join(e2eDir, 'screenshots');

// Test file mapping
const testFiles = {
  full: 'test_full_navigation.py',
  admin: 'test_admin_navigation.py',
  lambda: 'test_lambda_user_navigation.py'
};

// Colors
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function logStep(message) {
  console.log('');
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green, '[OK]', message);
}

function logError(message) {
  log(colors.red, '[ERROR]', message);
}

function logInfo(message) {
  log(colors.yellow, '[INFO]', message);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

function runCommandSync(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (e) {
    return null;
  }
}

function rmdir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function mkdir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const startTime = Date.now();
  let testResult = 1;

  // Banner
  console.log('');
  console.log(`${colors.magenta}  ____  _           _                     _____         _       ${colors.reset}`);
  console.log(`${colors.magenta} / ___|| | ___  ___| |_ __ ___  _ __ ___ |_   _|__  ___| |_ ___ ${colors.reset}`);
  console.log(`${colors.magenta} \\___ \\| |/ _ \\/ _ \\ | '__/ _ \\| '_ \` _ \\  | |/ _ \\/ __| __/ __|${colors.reset}`);
  console.log(`${colors.magenta}  ___) |  __/  __/ | | | (_) | | | | | | | |  __/\\__ \\ |_\\__ \\${colors.reset}`);
  console.log(`${colors.magenta} |____/|\\___|\\___| |_|  \\___/|_| |_| |_| |_|\\___||___/\\__|___/${colors.reset}`);
  console.log('');
  console.log(`${colors.white}  ClimbTracker E2E Selenium Tests${colors.reset}`);
  console.log('');

  logInfo(`Test type: ${testType}`);
  logInfo(`Test file: ${testFiles[testType]}`);
  logInfo(`Headless mode: ${headless}`);

  try {
    // Check Python
    logStep('Checking Python installation');
    const pythonVersion = runCommandSync('python --version');
    if (!pythonVersion) {
      throw new Error('Python is not installed or not in PATH');
    }
    logSuccess(`Python found: ${pythonVersion.trim()}`);

    // Check e2e directory
    logStep('Checking e2e directory');
    if (!fs.existsSync(e2eDir)) {
      throw new Error(`E2E directory not found: ${e2eDir}`);
    }
    logSuccess(`E2E directory: ${e2eDir}`);

    // Create directories
    logStep('Creating output directories');
    mkdir(reportsDir);
    mkdir(screenshotsDir);
    logSuccess('Created reports and screenshots directories');

    // Remove existing venv
    logStep('Creating Python virtual environment');
    if (fs.existsSync(venvDir)) {
      logInfo('Removing existing venv...');
      rmdir(venvDir);
    }

    // Create venv
    await runCommand('python', ['-m', 'venv', 'venv'], { cwd: e2eDir });
    logSuccess('Virtual environment created');

    // Determine pip and python paths
    const isWindows = process.platform === 'win32';
    const venvPython = isWindows
      ? path.join(venvDir, 'Scripts', 'python.exe')
      : path.join(venvDir, 'bin', 'python');
    const venvPip = isWindows
      ? path.join(venvDir, 'Scripts', 'pip.exe')
      : path.join(venvDir, 'bin', 'pip');

    // Install dependencies
    logStep('Installing dependencies');
    await runCommand(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip', '-q'], { cwd: e2eDir });
    await runCommand(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt', '-q'], { cwd: e2eDir });
    logSuccess('Dependencies installed');

    // Set headless mode
    const env = { ...process.env };
    if (headless) {
      env.HEADLESS = 'true';
      logInfo('Headless mode enabled');
    }

    // Generate report filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportFile = path.join(reportsDir, `test_report_${timestamp}.html`);

    // Run tests
    logStep(`Running Selenium tests: ${testType}`);

    const pytestArgs = [
      '-m', 'pytest',
      '-v',
      '--tb=short',
      `--html=${reportFile}`,
      '--self-contained-html',
      testFiles[testType]
    ];

    logInfo(`Running: python ${pytestArgs.join(' ')}`);
    console.log('');

    try {
      await runCommand(venvPython, pytestArgs, { cwd: e2eDir, env });
      testResult = 0;
    } catch (e) {
      testResult = 1;
    }

    // Cleanup
    logStep('Cleaning up');

    if (!keepVenv) {
      logInfo('Removing virtual environment...');
      rmdir(venvDir);
      logSuccess('Virtual environment removed');
    } else {
      logInfo('Keeping virtual environment (--keep-venv specified)');
    }

    // Remove __pycache__
    const pycacheDir = path.join(e2eDir, '__pycache__');
    rmdir(pycacheDir);
    logSuccess('Python cache cleaned');

    // Remove .pytest_cache
    const pytestCacheDir = path.join(e2eDir, '.pytest_cache');
    rmdir(pytestCacheDir);
    logSuccess('Pytest cache cleaned');

    // Final report
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    console.log('');
    console.log(`${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.cyan}           TEST SUMMARY                 ${colors.reset}`);
    console.log(`${colors.cyan}========================================${colors.reset}`);
    console.log('');

    if (testResult === 0) {
      console.log(`  Status: ${colors.green}PASSED${colors.reset}`);
    } else {
      console.log(`  Status: ${colors.red}FAILED${colors.reset}`);
    }

    console.log(`  Test Type: ${testType}`);
    console.log(`  Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    console.log(`  Report: ${reportFile}`);
    console.log('');

    // Open report in browser
    if (fs.existsSync(reportFile)) {
      logInfo('Opening test report in browser...');
      const openCmd = isWindows ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
      try {
        execSync(`${openCmd} "${reportFile}"`, { stdio: 'ignore' });
      } catch (e) {
        // Ignore errors opening browser
      }
    }

    console.log(`${colors.cyan}========================================${colors.reset}`);
    console.log('');

  } catch (error) {
    logError(error.message);

    // Cleanup on error
    if (!keepVenv && fs.existsSync(venvDir)) {
      rmdir(venvDir);
    }
  }

  process.exit(testResult);
}

main();
