// src/components/AnalyticsPrimitives.tsx
import React from 'react';
import { Typography, Skeleton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

/* --- 1. Stat Widget (Used in Admin & Analytics) --- */
interface StatWidgetProps {
  title: string;
  value: string | number;
  loading?: boolean;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon?: React.ElementType;
}

export const StatWidget = ({ title, value, loading, bgColor, borderColor, textColor, icon: Icon }: StatWidgetProps) => (
  <div className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border min-h-[110px] w-full relative overflow-hidden ${bgColor} ${borderColor} hover:shadow-md transition-all`}>
    {Icon && (
      <div className="absolute top-2 right-2 opacity-10">
        {/* Nuked the sx prop here! */}
        <Icon className="!text-[40px]" />
      </div>
    )}
    {loading ? (
      <div className="flex flex-col items-center w-full">
        <Skeleton width="60%" height={40} />
        <Skeleton width="40%" height={20} />
      </div>
    ) : (
      <>
        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-3xl z-10">{value}</Typography>
        <Typography variant="body2" className={`${textColor} font-bold uppercase tracking-wider text-[10px] text-center z-10`}>{title}</Typography>
      </>
    )}
  </div>
);

/* --- 2. Chart Card Wrapper --- */
interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ChartCard = ({ title, subtitle, icon: Icon, iconColor, children, footer }: ChartCardProps) => (
  <div className="p-4 rounded-2xl border border-slate-100 bg-white flex flex-col shadow-sm h-full w-full overflow-hidden">
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className={iconColor} />}
      <div>
        <Typography className="font-bold text-slate-700 text-sm">{title}</Typography>
        {subtitle && <Typography className="text-xs text-slate-400">{subtitle}</Typography>}
      </div>
    </div>
    <div className="flex-1 w-full min-h-[300px] relative">
      {children}
    </div>
    {footer && <div className="mt-2 pt-2 border-t border-slate-50">{footer}</div>}
  </div>
);

/* --- 3. Universal Table (Used in Admin Dashboard) --- */
export const UniversalTable = ({ headers, rows }: { headers: string[], rows: any[][] }) => (
  <TableContainer component={Paper} elevation={0} className="h-full border border-slate-50 overflow-auto">
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          {headers.map((h, i) => (
            <TableCell
              key={i}
              className="!font-bold !text-xs !bg-[#f8fafc] !border-b border-slate-200"
            >
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i} hover>
            {/* Replaced sx with strict Tailwind classes */}
            {row.map((cell, j) => (
              <TableCell key={j} className="!text-xs !border-b-slate-100">
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);