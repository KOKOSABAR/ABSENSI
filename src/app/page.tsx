'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Staff, AttendanceStatus } from '../lib/types';
import { getAttendanceStatus } from '../lib/attendance';
import staffData from '../data/staff.json';
import mockAttendance from '../data/attendance_mock.json';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Filter,
  X,
  RefreshCw,
  Download
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { UploadStaff } from '../components/UploadStaff';
import { UpdateAttendance } from '../components/UpdateAttendance';
import { ShiftFrame } from '../components/ShiftFrame';
import { CredentialsModal } from '../components/CredentialsModal';

export default function Dashboard() {
  const [staff, setStaff] = useState<Staff[]>(staffData as Staff[]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(mockAttendance as AttendanceRecord[]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebLoading, setIsWebLoading] = useState(false);

    const statuses = staff.map(s => {
      const status = getAttendanceStatus(s, attendanceRecords);
      // Ensure we don't have undefined shift issues
      if (!s.shift) {
        console.warn(`Staff ${s.name} has no shift assigned.`);
      }
      return status;
    });
    setAttendanceStatuses(statuses);
  }, [staff, attendanceRecords]);

  const fetchAutomatedAttendance = async () => {
    setIsWebLoading(true);
    setError(null);
    try {
      const username = localStorage.getItem('attendance_user');
      const password = localStorage.getItem('attendance_pass');
      
      if (!username || !password) {
        setError('Harap atur Username & Password di menu Settings (⚙️) terlebih dahulu.');
        setIsWebLoading(false);
        return;
      }

      const response = await fetch('/api/attendance/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      if (data.success && data.records) {
        setAttendanceRecords(data.records);
        localStorage.setItem('attendance_records', JSON.stringify(data.records));
        
        // Use the same normalization as in attendance.ts for accurate count
        const normalizeForMatch = (name: string) => name.replace(/\s+/g, '').trim().toLowerCase();
        const matched = staff.filter(s => 
          data.records.some((r: any) => normalizeForMatch(r.name) === normalizeForMatch(s.name))
        ).length;

        setError(`Berhasil mengambil ${data.records.length} data web. (${matched} staff terdeteksi dari ${staff.length} total)`);
        setTimeout(() => setError(null), 5000);
      } else {
        setError(data.error || 'Gagal mengambil data dari website.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi saat mengambil data web.');
    } finally {
      setIsWebLoading(false);
    }
  };

  const handleStaffUpload = (newStaff: Staff[]) => {
    setStaff(newStaff);
    localStorage.setItem('attendance_staff', JSON.stringify(newStaff));
  };

  const handleAttendanceUpdate = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(newRecords);
    localStorage.setItem('attendance_records', JSON.stringify(newRecords));
  };

  const syncStaffFromGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // URL Web App Google Apps Script
      const url = 'https://script.google.com/macros/s/AKfycbxWyF9MHr-1syyRn7rOcgrmCgxKxQjKl2sj8Vtb9mcRNn8eOpBkrIK3Yk8zMeWSnIHKmA/exec';
      
      console.log('Fetching from Google Sheets...');
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      console.log('Data received from GAS:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        // Mapping fields strictly according to google_script.gs output:
        // shift, name, startTime, endTime
        const mappedStaff = data.map((item: any) => ({
          name: (item.name || item.Nama || '').trim(),
          shift: (item.shift || item.Shift || '').toUpperCase().trim(),
          startTime: item.startTime || item['Jam Masuk'] || null,
          endTime: item.endTime || item['Jam Pulang'] || null
        })).filter(s => s.name !== '' && s.shift !== '');

        if (mappedStaff.length === 0) {
          throw new Error('Tidak ada data staff yang valid ditemukan dalam Spreadsheet.');
        }

        setStaff(mappedStaff);
        localStorage.setItem('attendance_staff', JSON.stringify(mappedStaff));
        
        setError(`Berhasil sinkronisasi ${mappedStaff.length} staff dari Google Sheets.`);
        setTimeout(() => setError(null), 5000);
      } else {
        throw new Error(data.error || 'Data Google Sheets kosong atau format tidak sesuai.');
      }
    } catch (err: any) {
      console.error('Sync Error:', err);
      setError(`Gagal sinkronisasi: ${err.message}. Pastikan URL Web App benar dan sudah di-Deploy sebagai 'Anyone'.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedStaff = localStorage.getItem('attendance_staff');
    const savedRecords = localStorage.getItem('attendance_records');
    if (savedStaff) setStaff(JSON.parse(savedStaff));
    if (savedRecords) setAttendanceRecords(JSON.parse(savedRecords));

    // Listen for storage changes from extension (if it updates localStorage)
    // or just periodic check if we want to be fancy.
    // However, the easiest for "scrpy langsung" extension is for the extension 
    // to just tell the dashboard to refresh.
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'attendance_records' && e.newValue) {
        setAttendanceRecords(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getFilteredByShift = (shiftName: string, onlyAbsent: boolean = false) => {
    const statuses = attendanceStatuses.filter(status => {
      const matchesSearch = status.staff.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShift = status.staff.shift.toUpperCase() === shiftName.toUpperCase();
      return matchesSearch && matchesShift;
    });
    return onlyAbsent ? statuses.filter(s => s.isAbsent) : statuses;
  };

  const stats = {
    total: attendanceStatuses.length,
    present: attendanceStatuses.filter(s => !s.isAbsent).length,
    late: attendanceStatuses.filter(s => s.isLate).length,
    absent: attendanceStatuses.filter(s => s.isAbsent).length,
  };

  return (
    <main className="min-h-screen bg-black p-4 md:p-8 text-white">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/50 backdrop-blur-md p-6 rounded-2xl border border-zinc-800 shadow-2xl">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">DASHBOARD ABSENSI</h1>
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Monitoring Kehadiran Staff Per Shift</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <a 
              href="/wbteam-scraper.zip" 
              download 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              DOWNLOAD EXTENSION
            </a>
            <CredentialsModal onSave={() => {}} />
            <button 
              disabled={isWebLoading}
              onClick={fetchAutomatedAttendance}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-md",
                isWebLoading && "animate-pulse"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isWebLoading && "animate-spin")} />
              {isWebLoading ? 'AMBIL DATA WEB...' : 'AMBIL DATA WEB'}
            </button>
            <button 
              disabled={isLoading}
              onClick={syncStaffFromGoogle}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              SYNC SPREADSHEET
            </button>
            <UploadStaff onUpload={handleStaffUpload} />
            <UpdateAttendance onUpdate={handleAttendanceUpdate} />
          </div>
        </header>

        {error && (
          <div className={cn(
            "p-4 border rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top duration-300",
            error.includes('Berhasil') ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}>
            {error.includes('Berhasil') ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p className="font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="Total Staff" value={stats.total} color="slate" />
          <QuickStat label="Hadir" value={stats.present} color="emerald" />
          <QuickStat label="Late" value={stats.late} color="amber" />
          <QuickStat label="Absen" value={stats.absent} color="rose" />
        </div>

        {/* Shift Frames Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* PAGI */}
          <div className="space-y-4">
            <ShiftFrame 
              title="BELUM ABSEN (PAGI)" 
              timeRange="" 
              color="rose"
              statuses={getFilteredByShift('PAGI', true)}
              isAbsentOnly 
            />
            <ShiftFrame 
              title="SHIFT PAGI" 
              timeRange="07:45:00 - 09:45:00" 
              color="blue"
              statuses={getFilteredByShift('PAGI')} 
            />
          </div>

          {/* SIANG */}
          <div className="space-y-4">
            <ShiftFrame 
              title="BELUM ABSEN (SIANG)" 
              timeRange="" 
              color="rose"
              statuses={getFilteredByShift('SIANG', true)}
              isAbsentOnly 
            />
            <ShiftFrame 
              title="SHIFT SIANG" 
              timeRange="11:45:00 - 12:45:00" 
              color="orange"
              statuses={getFilteredByShift('SIANG')} 
            />
          </div>

          {/* SORE */}
          <div className="space-y-4">
            <ShiftFrame 
              title="BELUM ABSEN (SORE)" 
              timeRange="" 
              color="rose"
              statuses={getFilteredByShift('SORE', true)}
              isAbsentOnly 
            />
            <ShiftFrame 
              title="SHIFT SORE" 
              timeRange="13:45:00 - 17:45:00" 
              color="purple"
              statuses={getFilteredByShift('SORE')} 
            />
          </div>

          {/* MALAM */}
          <div className="space-y-4">
            <ShiftFrame 
              title="BELUM ABSEN (MALAM)" 
              timeRange="" 
              color="rose"
              statuses={getFilteredByShift('MALAM', true)}
              isAbsentOnly 
            />
            <ShiftFrame 
              title="SHIFT MALAM" 
              timeRange="19:45:00 - 23:45:00" 
              color="slate"
              statuses={getFilteredByShift('MALAM')} 
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function QuickStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate: "text-slate-600 bg-slate-100 border-slate-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
  };
  return (
    <div className={cn("px-4 py-3 rounded-xl border flex items-center justify-between bg-white shadow-sm", colors[color])}>
      <span className="text-[10px] font-black tracking-widest">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: 'indigo' | 'emerald' | 'amber' | 'rose' }) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
      </div>
    </div>
  );
}
