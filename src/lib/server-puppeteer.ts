import chromium from '@sparticuz/chromium';
import puppeteerCore, { type LaunchOptions } from 'puppeteer-core';

/**
 * Launch a Puppeteer browser instance that works both locally and on serverless runtimes.
 */
export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Local development
  if (!isProduction) {
    try {
      const puppeteer = await import(/* webpackIgnore: true */ 'puppeteer');
      if (puppeteer?.launch) {
        console.log('[server-puppeteer] 🏠 Launching local Puppeteer');
        return puppeteer.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
    } catch (error) {
      console.warn('[server-puppeteer] Local puppeteer not available, falling back to chromium bundle.', error);
    }
  }

  // Production - Vercel/Serverless
  console.log('[server-puppeteer] 🚀 Launching production Chromium');
  
  const executablePath = await chromium.executablePath();
  
  if (!executablePath) {
    throw new Error('[server-puppeteer] ❌ Unable to resolve Chromium executable path.');
  }

  console.log('[server-puppeteer] 📍 Executable path:', executablePath);

  const options: LaunchOptions = {
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Critical for limited memory
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // Important for serverless
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ],
    defaultViewport: { width: 1280, height: 720 },
    executablePath,
    headless: true,
  };

  console.log('[server-puppeteer] ⚙️  Launch args:', options.args);

  try {
    const browser = await puppeteerCore.launch(options);
    console.log('[server-puppeteer] ✅ Browser launched successfully');
    return browser;
  } catch (error) {
    console.error('[server-puppeteer] ❌ Failed to launch browser:', error);
    throw error;
  }
}

export default {
  launchBrowser,
};