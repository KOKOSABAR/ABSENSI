import { chromium } from 'playwright';
import { AttendanceRecord } from './types';

export async function scrapeAttendance(username?: string, password?: string): Promise<AttendanceRecord[]> {
  const browser = await chromium.launch({ 
    headless: true,
    channel: 'chrome' // Use installed Chrome if Playwright's Chromium is missing
  });
  const page = await browser.newPage();
  
  // Proxy console logs from the page to our terminal
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    await page.goto('https://aa.wbteam.cloud/attendance', { waitUntil: 'domcontentloaded' });

    // Check if we need to login
    const loginInput = await page.$('input[name="username"]');
    if (loginInput) {
      console.log('Login required, filling credentials...');
      if (!username || !password) {
        throw new Error('Kredensial diperlukan untuk login. Harap atur di Settings (⚙️).');
      }
      await page.fill('input[name="username"]', username);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      
      // Wait for login success - look for common dashboard markers or URL change
      try {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e) {
        console.log('Login navigation timeout, checking current state...');
      }
      
      console.log('After login attempt, current URL:', page.url());
      if (page.url().includes('login')) {
        throw new Error('Login gagal. Silakan periksa kembali Username & Password Anda.');
      }
    }

    // Wait for the page to be ready
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000); 

    // Look for iframes first - sometimes content is inside an iframe
    const frames = page.frames();
    console.log(`Found ${frames.length} frames on page`);

    async function scrapeFromFrame(f: any) {
        // Try to find and click "Daftar Hadir" tab in this frame
        const tabSelectors = [
          'text=Daftar Hadir',
          'button:has-text("Daftar Hadir")',
          'a:has-text("Daftar Hadir")',
          '.nav-link:has-text("Daftar Hadir")',
          '[role="tab"]:has-text("Daftar Hadir")',
          'div:has-text("Daftar Hadir")'
        ];

        for (const selector of tabSelectors) {
          try {
            const tab = await f.$(selector);
            if (tab) {
              await tab.click();
              console.log(`Clicked "Daftar Hadir" in frame ${f.name() || 'main'} using ${selector}`);
              await page.waitForTimeout(4000);
              break;
            }
          } catch (e) {}
        }

      return await f.evaluate(() => {
        const clean = (t: string | null) => t?.trim().replace(/\s+/g, ' ') || '';
        const results: any[] = [];
        
        // 1. Try Table layout
        const tables = Array.from(document.querySelectorAll('table'));
        for (const table of tables) {
          const headers = Array.from(table.querySelectorAll('th, td[style*="bold"]')).map(h => clean(h.textContent).toUpperCase());
          if (headers.some(h => h.includes('KARYAWAN') || h.includes('NAMA'))) {
            const rows = Array.from(table.querySelectorAll('tr'));
            rows.forEach(row => {
              const cells = Array.from(row.querySelectorAll('td'));
              if (cells.length < 3) return;
              const name = clean(cells[0].textContent).split('\n')[0];
              if (!name || name === 'Karyawan' || name === 'Nama' || name.length < 2) return;
              const times = row.textContent?.match(/\d{2}[:.]\d{2}/g) || [];
              results.push({
                name,
                role: 'GENERAL',
                jobDesk: [clean(cells[1]?.textContent || '')],
                mobileCheckIn: times[0]?.replace(':', '.') || '-',
                desktopCheckIn: times[1]?.replace(':', '.') || '-',
                checkOut: times[2] || '--:--',
                status: row.textContent?.includes('HADIR') ? 'HADIR' : 'BELUM ABSEN',
                duration: '-'
              });
            });
          }
        }

        if (results.length > 0) return results;

        // 2. Try Card/Flex layout (seen in recent screenshot)
        const potentialCards = Array.from(document.querySelectorAll('div'))
          .filter(el => {
            const t = el.textContent?.toUpperCase() || '';
            return (t.includes('HADIR') || t.includes('BELUM ABSEN')) && 
                   /\d{2}[:.]\d{2}/.test(t) && 
                   el.children.length >= 3 && el.children.length < 15;
          });

        const individualCards = potentialCards.filter(card => {
          return !potentialCards.some(other => card !== other && card.contains(other));
        });

        individualCards.forEach(card => {
          const text = card.textContent || '';
          const times = text.match(/\d{2}[:.]\d{2}/g) || [];
          const nameEl = card.querySelector('b, strong, [style*="orange"], [class*="name"]');
          let name = nameEl ? clean(nameEl.textContent) : clean(card.children[0]?.textContent).split('\n')[0];
          
          if (!name || name.length < 2 || name === 'Karyawan') return;

          results.push({
            name,
            role: text.toUpperCase().includes('CS') ? 'CS' : 'GENERAL',
            jobDesk: [],
            mobileCheckIn: times[0]?.replace(':', '.') || '-',
            desktopCheckIn: times[1]?.replace(':', '.') || '-',
            checkOut: times[2] || '--:--',
            status: text.includes('HADIR') ? 'HADIR' : 'BELUM ABSEN',
            duration: '-'
          });
        });

        return results;
      });
    }

    let allRecords: AttendanceRecord[] = [];

    // Try scraping from each frame
    for (const frame of frames) {
      try {
        const frameRecords = await scrapeFromFrame(frame);
        if (frameRecords && frameRecords.length > 0) {
          console.log(`Frame ${frame.name() || 'main'} returned ${frameRecords.length} records`);
          allRecords = [...allRecords, ...frameRecords];
        }
      } catch (e) {
        console.log(`Error scraping frame: ${e}`);
      }
    }

    // De-duplicate by name
    const uniqueRecords = Array.from(new Map(allRecords.map(r => [r.name, r])).values());

    console.log(`Scraped total: ${uniqueRecords.length} unique records`);
    return uniqueRecords;
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}
