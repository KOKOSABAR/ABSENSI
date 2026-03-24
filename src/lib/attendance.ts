import { SHIFTS } from './constants';
import { AttendanceRecord, AttendanceStatus, Staff } from './types';
import { isAfter, parse, isValid } from 'date-fns';

export function getAttendanceStatus(staff: Staff, records: AttendanceRecord[]): AttendanceStatus {
  // Normalize function: remove all spaces and lowercase
  const normalizeForMatch = (name: string) => name.replace(/\s+/g, '').trim().toLowerCase();
  
  const staffFullName = staff.name.toLowerCase().trim();
  const staffNormalized = normalizeForMatch(staff.name);
  
  // 100% Strict Matching Logic
  const record = records.find(r => {
    const recordFullName = r.name.toLowerCase().trim();
    const recordNormalized = normalizeForMatch(r.name);

    // Exact match (case-insensitive and normalized spaces)
    const isExact = staffNormalized === recordNormalized || staffFullName === recordFullName;
    if (isExact) return true;

    // Special case for names like "FAISAL SABARYANTO" vs "FAISAL SABARYA"
    // (Website might truncate names in some views)
    if (recordNormalized.length >= 8 && staffNormalized.startsWith(recordNormalized)) return true;
    if (staffNormalized.length >= 8 && recordNormalized.startsWith(staffNormalized)) return true;

    return false;
  });
  
  // Ambil jam kerja dari staff (Spreadsheet) atau fallback ke SHIFTS constants
  let shiftStartTimeStr = staff.startTime || SHIFTS[staff.shift]?.startTime || '08:00:00';

  // Fix for long date strings from Google Apps Script (e.g. Sat Dec 30 1899 07:45:00...)
  if (shiftStartTimeStr.length > 10) {
    const timeMatch = shiftStartTimeStr.match(/\d{2}:\d{2}:\d{2}/);
    if (timeMatch) shiftStartTimeStr = timeMatch[0];
  }

  if (!record) {
    return {
      staff,
      record: undefined,
      isLate: false,
      isOnTime: false,
      isAbsent: true,
    };
  }

  const checkInTimeStr = record.desktopCheckIn && record.desktopCheckIn !== '-' ? record.desktopCheckIn : record.mobileCheckIn;
  if (!checkInTimeStr || checkInTimeStr === '-') {
    return {
      staff,
      record,
      isLate: false,
      isOnTime: false,
      isAbsent: true,
    };
  }

  const checkInTime = parse(checkInTimeStr.replace('.', ':'), 'HH:mm', new Date());
  const shiftStartTime = parse(shiftStartTimeStr, 'HH:mm:ss', new Date());

  if (!isValid(checkInTime)) {
    return {
      staff,
      record,
      isLate: false,
      isOnTime: false,
      isAbsent: true,
    };
  }

  const isLate = isAfter(checkInTime, shiftStartTime);

  return {
    staff,
    record,
    isLate,
    isOnTime: !isLate,
    isAbsent: false,
  };
}
