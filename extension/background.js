// background.js - Manage auto-sync timer
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "autoScrape") {
    startAutoScraping();
  } else if (alarm.name === "autoReload") {
    reloadAttendanceTabs();
  }
});

async function reloadAttendanceTabs() {
  try {
    const { autoSync } = await chrome.storage.local.get(['autoSync']);
    if (!autoSync) return;

    const tabs = await chrome.tabs.query({ url: "https://aa.wbteam.cloud/attendance*" });
    for (const tab of tabs) {
      chrome.tabs.reload(tab.id);
      console.log(`Reloaded tab: ${tab.id}`);
    }
  } catch (err) {
    console.error("Auto reload error:", err);
  }
}

async function startAutoScraping() {
  try {
    // Check if autoSync is still enabled in storage
    const { autoSync } = await chrome.storage.local.get(['autoSync']);
    if (!autoSync) {
      chrome.alarms.clear("autoScrape");
      return;
    }

    const tabs = await chrome.tabs.query({ url: "https://aa.wbteam.cloud/attendance*" });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { action: "scrapeAttendance" }, async (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.success) {
          await sendToDashboard(response.records);
        }
      });
    }
  } catch (err) {
    console.error("Auto scrape error:", err);
  }
}

async function sendToDashboard(records) {
  try {
    const { dashboardUrl = 'http://localhost:3000' } = await chrome.storage.local.get(['dashboardUrl']);
    const baseUrl = dashboardUrl.replace(/\/$/, '');

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
    } else {
      await fetch(`${baseUrl}/api/attendance/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
    }
  } catch (err) {
    console.error("Dashboard sync error:", err);
  }
}

// Ensure alarm is created correctly with minimal delay
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTimer") {
    // 10 seconds scrape
    chrome.alarms.create("autoScrape", { 
      periodInMinutes: 0.166, 
      when: Date.now() + 1000 
    });
    // 30 seconds reload
    chrome.alarms.create("autoReload", {
      periodInMinutes: 0.5,
      when: Date.now() + 30000
    });
    startAutoScraping(); 
    sendResponse({ success: true });
  } else if (request.action === "stopTimer") {
    chrome.alarms.clear("autoScrape");
    chrome.alarms.clear("autoReload");
    sendResponse({ success: true });
  }
});