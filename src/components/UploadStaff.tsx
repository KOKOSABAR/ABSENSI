'use client';

import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Staff } from '../lib/types';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface UploadStaffProps {
  onUpload: (staff: Staff[]) => void;
}

export function UploadStaff({ onUpload }: UploadStaffProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      const staff: Staff[] = data.map(row => ({
        name: row['NAMA STAFF'] || row['Nama Staff'] || row['name'] || row['Name'],
        shift: (row['SHIFT'] || row['Shift'] || row['shift']).toUpperCase(),
        startTime: row['JAM KERJA'] || row['Jam Kerja'] || undefined,
        endTime: row['JAM PULANG'] || row['Jam Pulang'] || undefined
      })).filter(s => s.name && s.shift);

      onUpload(staff);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Upload Spreadsheet Staff
      </button>
    </div>
  );
}
