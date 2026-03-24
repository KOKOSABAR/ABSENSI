/**
 * Google Apps Script untuk menghubungkan Spreadsheet ke Dashboard Absensi
 * 
 * Cara Penggunaan:
 * 1. Buka Google Sheets Anda.
 * 2. Klik menu 'Extensions' -> 'Apps Script'.
 * 3. Hapus kode yang ada dan paste kode ini.
 * 4. Klik ikon Save, beri nama 'AbsensiAPI'.
 * 5. Klik tombol 'Deploy' -> 'New deployment'.
 * 6. Pilih type 'Web app'.
 * 7. Ubah 'Who has access' menjadi 'Anyone'.
 * 8. Klik Deploy dan salin Web App URL-nya.
 */

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DATA SHIFT ONLINE'); // Mengambil sheet berdasarkan nama
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet 'DATA SHIFT ONLINE' tidak ditemukan" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  
  const headers = data[0]; // SHIFT, NAMA STAFF, JAM KERJA, JAM PULANG
  const rows = data.slice(1);
  
  const result = rows.map(row => {
    // Melewati baris kosong
    if (!row[1]) return null;
    
    return {
      shift: row[0],
      name: row[1],
      startTime: formatTime(row[2]),
      endTime: formatTime(row[3])
    };
  }).filter(item => item !== null);
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Memastikan format waktu adalah HH:mm:ss
 */
function formatTime(timeValue) {
  if (!timeValue) return "00:00:00";
  if (timeValue instanceof Date) {
    return Utilities.formatDate(timeValue, Session.getScriptTimeZone(), "HH:mm:ss");
  }
  return timeValue.toString();
}
