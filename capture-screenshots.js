const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshots() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  try {
    const page = await browser.newPage();

    // Capture dashboard
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for animations/rendering
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const dashboardPath = path.join(__dirname, 'dashboard-screenshot.png');
    await page.screenshot({ 
      path: dashboardPath,
      fullPage: true 
    });
    console.log(`✓ Dashboard screenshot saved to: ${dashboardPath}`);

    // Capture quests page
    console.log('Navigating to quests page...');
    await page.goto('http://localhost:3001/quests', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for animations/rendering
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const questsPath = path.join(__dirname, 'quests-screenshot.png');
    await page.screenshot({ 
      path: questsPath,
      fullPage: true 
    });
    console.log(`✓ Quests screenshot saved to: ${questsPath}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

captureScreenshots();
