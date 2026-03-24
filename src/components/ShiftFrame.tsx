'use client';

import React from 'react';
import { AttendanceStatus } from '../lib/types';
import { Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ShiftFrameProps {
  title: string;
  timeRange: string;
  statuses: AttendanceStatus[];
  color: 'blue' | 'orange' | 'purple' | 'slate' | 'rose';
  isAbsentOnly?: boolean;
}

export function ShiftFrame({ title, timeRange, statuses, color, isAbsentOnly = false }: ShiftFrameProps) {
  const colorClasses = {
    blue: "border-blue-900/50 bg-blue-950/20 text-blue-400",
    orange: "border-orange-900/50 bg-orange-950/20 text-orange-400",
    purple: "border-purple-900/50 bg-purple-950/20 text-purple-400",
    slate: "border-zinc-800 bg-zinc-900/50 text-zinc-400",
    rose: "border-rose-900/50 bg-rose-950/20 text-rose-400",
  };

  const badgeClasses = {
    blue: "bg-blue-950/50 text-blue-300 border border-blue-800",
    orange: "bg-orange-950/50 text-orange-300 border border-orange-800",
    purple: "bg-purple-950/50 text-purple-300 border border-purple-800",
    slate: "bg-zinc-800 text-zinc-300 border border-zinc-700",
    rose: "bg-rose-950/50 text-rose-300 border border-rose-800",
  };

  const presentCount = statuses.filter(s => !s.isAbsent).length;
  const lateCount = statuses.filter(s => s.isLate).length;
  const absentCount = statuses.filter(s => s.isAbsent).length;

  return (
    <div className={cn("flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-sm w-full", colorClasses[color], isAbsentOnly ? "h-[300px]" : "h-[500px]")}>
      <div className="p-5 border-b border-inherit shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
            {!isAbsentOnly && <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase mt-0.5">{timeRange}</p>}
          </div>
          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-tighter shadow-sm shrink-0", badgeClasses[color])}>
            {statuses.length} {isAbsentOnly ? 'ABSEN' : 'STAFF'}
          </span>
        </div>
        
        {!isAbsentOnly && (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="HADIR" value={presentCount} color="emerald" />
            <MiniStat label="LATE" value={lateCount} color="amber" />
            <MiniStat label="ABSEN" value={absentCount} color="rose" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-950/30 custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed">
          {!isAbsentOnly && (
            <thead className="sticky top-0 bg-zinc-900/80 backdrop-blur-md z-10 border-b border-zinc-800">
              <tr className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                <th className="px-3 py-2 w-[45%]">Staff</th>
                <th className="px-2 py-2 w-[15%] text-center">Mbl</th>
                <th className="px-2 py-2 w-[15%] text-center">Dsk</th>
                <th className="px-3 py-2 w-[25%] text-right">Status</th>
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-zinc-800/50">
            {statuses.length === 0 ? (
              <tr>
                <td colSpan={isAbsentOnly ? 1 : 4} className="px-3 py-8 text-center text-zinc-600 text-xs italic">
                  {isAbsentOnly ? 'Semua staff sudah absen' : 'Tidak ada staff di shift ini'}
                </td>
              </tr>
            ) : (
              statuses.map((status, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className={cn("font-bold text-zinc-100 group-hover:text-white transition-colors break-words leading-tight", isAbsentOnly ? "text-[11px]" : "text-xs")} title={status.staff.name}>
                        {status.staff.name}
                      </span>
                      {!isAbsentOnly && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {status.record?.jobDesk.slice(0, 1).map((job, i) => (
                            <span key={i} className="text-[7px] bg-zinc-800 px-1 rounded border border-zinc-700 text-zinc-400 uppercase">
                              {job}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  {!isAbsentOnly && (
                    <>
                      <td className="px-2 py-3">
                        <span className={cn(
                          "text-[10px] font-mono",
                          status.record?.mobileCheckIn && status.record.mobileCheckIn !== '-' ? "text-emerald-400 font-bold" : "text-zinc-600"
                        )}>
                          {status.record?.mobileCheckIn || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className={cn(
                          "text-[10px] font-mono",
                          status.record?.desktopCheckIn && status.record.desktopCheckIn !== '-' ? "text-indigo-400 font-bold" : "text-zinc-600"
                        )}>
                          {status.record?.desktopCheckIn || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {status.isAbsent ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <XCircle className="w-2 h-2" /> ABSEN
                          </span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border",
                            status.isLate 
                              ? "text-amber-500 bg-amber-500/10 border-amber-500/20" 
                              : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                          )}>
                            <CheckCircle2 className="w-2 h-2" /> {status.isLate ? 'LATE' : 'OK'}
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: 'emerald' | 'amber' | 'rose' }) {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/5 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/5 border-rose-500/20",
  };
  return (
    <div className={cn("text-center p-2 rounded-xl border backdrop-blur-sm", colors[color])}>
      <div className="text-sm font-black leading-none">{value}</div>
      <div className="text-[7px] uppercase font-black opacity-60 mt-1 tracking-widest">{label}</div>
    </div>
  );
}
