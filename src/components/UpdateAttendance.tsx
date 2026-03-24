'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '../lib/types';
import { Database, AlertCircle, X, ClipboardCheck } from 'lucide-react';

interface UpdateAttendanceProps {
  onUpdate: (records: AttendanceRecord[]) => void;
}

export function UpdateAttendance({ onUpdate }: UpdateAttendanceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [error, setError] = useState('');

  const parseRawAttendance = (text: string): AttendanceRecord[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const records: AttendanceRecord[] = [];
    
    let currentBlock: string[] = [];
    
    for (const line of lines) {
      currentBlock.push(line);
      
      // If line contains status markers, finalize the block
      if (line.toLowerCase().includes('hadir') || line.toLowerCase().includes('absen')) {
        const record = processBlock(currentBlock);
        if (record) records.push(record);
        currentBlock = [];
      }
    }
    
    return records;
  };

  const processBlock = (block: string[]): AttendanceRecord | null => {
    if (block.length < 4) return null;

    // Based on user sample:
    // Line 0: Name
    // Line 1: Name (repeat)
    // Line 2: Role
    // ... Job Desks ...
    // Line N-3: Mobile
    // Line N-2: Desktop
    // Line N-1: Logout
    // Line N: Status

    const name = block[0];
    const role = block[2] || 'GENERAL';
    const statusLine = block[block.length - 1];
    
    // Find times - they are usually the 3 lines before the status
    // But let's look for time patterns \d\d.\d\d or \d\d:\d\d or - or --:--
    const timeRegex = /^(\d{2}[:.]\d{2}|-|--:--)$/;
    
    const times: string[] = [];
    const jobDesk: string[] = [];
    
    // We iterate from the line after role until the status line
    for (let i = 3; i < block.length - 1; i++) {
      if (timeRegex.test(block[i])) {
        times.push(block[i]);
      } else {
        jobDesk.push(block[i]);
      }
    }

    return {
      name,
      role: role.toUpperCase(),
      jobDesk: jobDesk.filter(j => j !== '-'),
      mobileCheckIn: times[0] || '-',
      desktopCheckIn: times[1] || '-',
      checkOut: times[2] || '--:--',
      status: statusLine.includes('Hadir') ? 'HADIR' : 'BELUM ABSEN',
      duration: '-'
    };
  };

  const handleUpdate = () => {
    try {
      const records = parseRawAttendance(pastedData);
      if (records.length > 0) {
        onUpdate(records);
        setIsOpen(false);
        setPastedData('');
        setError('');
      } else {
        setError('Tidak ada data yang berhasil dikenali. Pastikan format sesuai dengan yang Anda copy dari web.');
      }
    } catch (e) {
      setError('Gagal memproses data. Silakan periksa kembali teks yang Anda tempel.');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
      >
        <ClipboardCheck className="w-4 h-4" />
        Tempel Data Manual
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Tempel Data Kehadiran Manual</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3 text-indigo-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Cara Menggunakan:</p>
                  <p className="mt-1">
                    Blok seluruh daftar hadir di website WBTEAM (dari nama pertama sampai baris terakhir), 
                    lalu <b>Copy (Ctrl+C)</b> dan <b>Paste (Ctrl+V)</b> di kotak bawah ini.
                  </p>
                </div>
              </div>

              <textarea 
                className="w-full h-80 p-4 font-mono text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Tempel data di sini...
Contoh:
VERRI AYANG
VERRI AYANG
general
COSTUMER SERVICE
09.06
-
--:--
Hadir"
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
              />

              {error && <p className="text-rose-600 text-sm font-medium">{error}</p>}
            </div>

            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleUpdate}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
              >
                Proses Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
