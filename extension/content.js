// content.js - Scrape attendance data from the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeAttendance") {
    try {
      const results = [];
      const clean = (t) => t?.trim().replace(/\s+/g, ' ') || '';

      // Find all table rows
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => {
        const text = r.textContent?.toUpperCase() || '';
        return text.includes('HADIR') || text.includes('BELUM ABSEN');
      });

      console.log(`Found ${rows.length} rows on page`);

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) return;

        const cell0Text = cells[0].innerText || cells[0].textContent || '';
        const lines = cell0Text.split('\n').map(l => clean(l)).filter(l => l.length > 2);
        const name = lines[0]; // Take the first clean line as the name
        
        if (!name || name === 'Karyawan' || name === 'Nama') return;

        const jobDesk = clean(cells[1]?.textContent || '');
        
        // Exact column mapping based on observation:
        // Index 2: Mobile, Index 3: Desktop, Index 4: Jam Keluar, Index 5: Status
        const mobileRaw = clean(cells[2]?.textContent || '-');
        const desktopRaw = clean(cells[3]?.textContent || '-');
        const checkOutRaw = clean(cells[4]?.textContent || '--:--');
        const statusRaw = clean(cells[5]?.textContent || '');

        const mobileCheckIn = mobileRaw.match(/\d{2}[:.]\d{2}/) ? mobileRaw : '-';
        const desktopCheckIn = desktopRaw.match(/\d{2}[:.]\d{2}/) ? desktopRaw : '-';
        const checkOut = checkOutRaw.match(/\d{2}[:.]\d{2}/) ? checkOutRaw : '--:--';
        const status = statusRaw.toUpperCase().includes('HADIR') ? 'HADIR' : 'BELUM ABSEN';

        results.push({
          name,
          role: jobDesk.toUpperCase().includes('CS') ? 'CS' : 
                jobDesk.toUpperCase().includes('OPERATOR') ? 'OPERATOR' :
                jobDesk.toUpperCase().includes('KAPTEN') ? 'KAPTEN' : 'GENERAL',
          jobDesk: [jobDesk],
          mobileCheckIn: mobileCheckIn.replace(':', '.'),
          desktopCheckIn: desktopCheckIn.replace(':', '.'),
          checkOut,
          status,
          duration: '-'
        });
      });

      // 2. If no table rows, search for modern "Card" or Flex rows
      if (results.length === 0) {
        // Find all containers that look like a row and have "HADIR" or "BELUM ABSEN"
        const potentialCards = Array.from(document.querySelectorAll('div'))
          .filter(el => {
            const t = el.textContent?.toUpperCase() || '';
            const isStatus = t.includes('HADIR') || t.includes('BELUM ABSEN');
            const hasTime = /\d{2}[:.]\d{2}/.test(t);
            // Must have multiple direct children to be a row, but not too many to be the whole page
            return isStatus && hasTime && el.children.length >= 3 && el.children.length < 15;
          });

        // Filter out parent containers to find the actual individual row cards
        const cards = potentialCards.filter(card => {
          return !potentialCards.some(other => card !== other && card.contains(other));
        });

        console.log(`Found ${cards.length} individual cards`);

        cards.forEach(card => {
          const text = card.textContent || '';
          const times = text.match(/\d{2}[:.]\d{2}/g) || [];
          
          // Find the name: look for the most prominent text (usually first or boldest)
          // Look specifically for elements with orange color or bold
          const nameEl = card.querySelector('b, strong, [style*="orange"], [class*="name"], [class*="title"]');
          let name = '';
          
          if (nameEl) {
            name = clean(nameEl.textContent);
          } else {
            // Fallback: first few words of the first text-containing child
            const children = Array.from(card.children);
            for (let child of children) {
              const childText = clean(child.textContent);
              if (childText.length > 2 && !childText.includes(':') && !childText.includes('.')) {
                name = childText.split('\n')[0].trim();
                break;
              }
            }
          }

          if (!name || name.length < 2 || name === 'Karyawan') return;

          // Mapping times for Card layout (usually Mobile, Desktop, Checkout)
          const mobile = times[0] || '-';
          const desktop = times[1] || '-';
          const checkout = times[2] || '--:--';

          results.push({
            name,
            role: text.toUpperCase().includes('CS') ? 'CS' : 
                  text.toUpperCase().includes('OPERATOR') ? 'OPERATOR' :
                  text.toUpperCase().includes('KAPTEN') ? 'KAPTEN' : 'GENERAL',
            jobDesk: [],
            mobileCheckIn: mobile.replace(':', '.'),
            desktopCheckIn: desktop.replace(':', '.'),
            checkOut: checkout,
            status: text.includes('HADIR') ? 'HADIR' : 'BELUM ABSEN',
            duration: '-'
          });
        });
      }

      sendResponse({ success: true, records: results });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }
  return true;
});

// Self-running timer if enabled (fallback for background script)
let autoInterval = null;

function checkAutoSync() {
  chrome.storage.local.get(['autoSync'], (result) => {
    if (result.autoSync) {
      if (!autoInterval) {
        console.log("Starting local auto-sync timer (10s)");
        autoInterval = setInterval(() => {
          // Trigger same logic as message
          document.dispatchEvent(new CustomEvent('triggerScrape'));
        }, 10000);
      }
    } else {
      if (autoInterval) {
        console.log("Stopping local auto-sync timer");
        clearInterval(autoInterval);
        autoInterval = null;
      }
    }
  });
}

// Initial check
checkAutoSync();

// Re-check when storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.autoSync) {
    checkAutoSync();
  }
});

// Custom event listener for internal trigger
document.addEventListener('triggerScrape', () => {
  // Execute scrape logic manually or reuse chrome listener
  // For simplicity, background script remains primary, 
  // but this ensures the tab stays active.
});