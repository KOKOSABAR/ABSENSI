export type Shift = 'PAGI' | 'SIANG' | 'SORE' | 'MALAM';

export interface ShiftSchedule {
  name: string;
  startTime: string; // HH:mm:ss
  endTime: string;   // HH:mm:ss
}

export interface Staff {
  name: string;
  shift: string;
  startTime?: string; // Jam Kerja dari Spreadsheet
  endTime?: string;   // Jam Pulang dari Spreadsheet
}

export interface AttendanceRecord {
  name: string;
  role: string;
  jobDesk: string[];
  mobileCheckIn?: string; // HH.mm
  desktopCheckIn?: string; // HH.mm
  checkOut?: string; // HH:mm
  status: string;
  duration: string;
}

export interface AttendanceStatus {
  staff: Staff;
  record?: AttendanceRecord;
  isLate: boolean;
  isOnTime: boolean;
  isAbsent: boolean;
}
