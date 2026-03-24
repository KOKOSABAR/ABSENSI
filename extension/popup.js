// popup.js - Handle user click and send data to dashboard
const scrapeBtn = document.getElementById('scrapeBtn');
const autoSyncToggle = document.getElementById('autoSyncToggle');
const dashboardUrlInput = document.getElementById('dashboardUrl');
const statusDiv = document.getElementById('status');

// Load states
chrome.storage.local.get(['autoSync', 'dashboardUrl'], (result) => {
  autoSyncToggle.checked = !!result.autoSync;
  dashboardUrlInput.value = result.dashboardUrl || 'http://localhost:3000';
});

// Save URL on change
dashboardUrlInput.addEventListener('change', (e) => {
  let url = e.target.value.trim();
  if (url.endsWith('/')) url = url.slice(0, -1);
  chrome.storage.local.set({ dashboardUrl: url });
});

// Toggle handler
autoSyncToggle.addEventListener('change', async (e) => {
  const isChecked = e.target.checked;
  chrome.storage.local.set({ autoSync: isChecked });
  
  if (isChecked) {
    chrome.runtime.sendMessage({ action: "startTimer" });
    statusDiv.textContent = 'Auto-Sync Aktif (Setiap 10 detik)';
    statusDiv.className = 'status success';
  } else {
    chrome.runtime.sendMessage({ action: "stopTimer" });
    statusDiv.textContent = 'Auto-Sync Dimatikan.';
    statusDiv.className = 'status';
  }
});

scrapeBtn.addEventListener('click', async () => {
  scrapeBtn.disabled = true;
  statusDiv.textContent = 'Mengekstrak data...';
  statusDiv.className = 'status';

  try {
    const { dashboardUrl = 'http://localhost:3000' } = await chrome.storage.local.get(['dashboardUrl']);
    const baseUrl = dashboardUrl.replace(/\/$/, '');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('aa.wbteam.cloud/attendance')) {
      throw new Error('Buka halaman WBTEAM Attendance terlebih dahulu!');
    }

    // Send message to content script to scrape
    const response = await chrome.tabs.sendMessage(tab.id, { action: "scrapeAttendance" });
    
    if (response && response.success) {
      const records = response.records;
      
      if (records.length === 0) {
        throw new Error('Tidak ada data karyawan ditemukan.');
      }

      statusDiv.textContent = `Berhasil mengambil ${records.length} data. Mengirim ke dashboard...`;

      // 1. Try to send via storage API if we're on the dashboard URL
      const dashboardTabs = await chrome.tabs.query({ url: baseUrl + "/*" });
      
      if (dashboardTabs.length > 0) {
        chrome.scripting.executeScript({
          target: { tabId: dashboardTabs[0].id },
          func: (data) => {
            localStorage.setItem('attendance_records', JSON.stringify(data));
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'attendance_records',
              newValue: JSON.stringify(data)
            }));
          },
          args: [records]
        });
        statusDiv.textContent = `Berhasil! ${records.length} data dikirim ke dashboard.`;
        statusDiv.className = 'status success';
      } else {
        // 2. Fallback: Send via API if no tab open
        const dashboardResponse = await fetch(`${baseUrl}/api/attendance/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records })
        });
        
        if (dashboardResponse.ok) {
          statusDiv.textContent = `Berhasil! Silakan buka/refresh dashboard ${baseUrl}`;
          statusDiv.className = 'status success';
        } else {
          throw new Error(`Gagal mengirim ke ${baseUrl}. Pastikan dashboard aktif.`);
        }
      }
    } else {
      throw new Error(response.error || 'Gagal mengekstrak data.');
    }
  } catch (err) {
    statusDiv.textContent = 'Error: ' + err.message;
    statusDiv.className = 'status error';
  } finally {
    scrapeBtn.disabled = false;
  }
});