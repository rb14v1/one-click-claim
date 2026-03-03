// src/pages/UserAnalytics.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  ArrowBack,
  BarChart as BarChartIcon,
  Timeline,
  Refresh,
  PieChart as PieChartIcon,
} from "@mui/icons-material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import toast, { Toaster } from "react-hot-toast";
import { MainLayout } from "../layout/MainLayout";
import { CHART_COLOR_ARRAY, BRAND_COLORS, UI_COLORS } from "../constants/colors";
import { StatWidget, ChartCard } from "../components/AnalyticsPrimitives";
import { useUserAnalytics } from "../hooks/useUserAnalytics";

// Custom component to split long X-Axis labels into two lines
const CustomXAxisTick = ({ x, y, payload }: any) => {
  if (!payload || !payload.value) return null;

  // Split the label into words and divide into two lines
  const words = payload.value.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill={UI_COLORS.slate500} fontSize={10}>
        <tspan textAnchor="middle" x="0">{line1}</tspan>
        {line2 && <tspan textAnchor="middle" x="0" dy="14">{line2}</tspan>}
      </text>
    </g>
  );
};

export const UserAnalytics = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState("month");

  const { stats, volumeData, statusData, trendData, loading, refetch } = useUserAnalytics(range);

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshing data...");
  };

  const handleRangeChange = (event: SelectChangeEvent) => {
    setRange(event.target.value as string);
  };

  const getChartTitle = () => {
    switch (range) {
      case "day": return "Spending Trend (Last 24h)";
      case "week": return "Spending Trend (Last 7 Days)";
      case "month": return "Spending Trend (Last 30 Days)";
      case "quarter": return "Spending Trend (Last 90 Days)";
      case "year": return "Spending Trend (Last Year)";
      case "all": return "Spending Trend (All Time)";
      default: return "Spending Trend";
    }
  };

  return (
    <MainLayout>
      <Toaster position="top-right" />
      <div className="bg-slate-50 w-full min-h-screen p-6 flex flex-col gap-6">

        {/* HEADER */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outlined"
              color="inherit"
              className="!border-slate-200 !text-slate-600 !min-w-[40px] !h-[40px] !p-0 hover:!bg-slate-50"
            >
              <ArrowBack fontSize="small" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800">
              Analytics Overview
            </h1>
          </div>

          <div className="flex gap-2 items-center">
            <Select
              size="small"
              value={range}
              onChange={handleRangeChange}
              className="bg-white !text-xs min-w-[140px]"
            >
              <MenuItem value="day" className="!text-xs">Daily View</MenuItem>
              <MenuItem value="week" className="!text-xs">Weekly View</MenuItem>
              <MenuItem value="month" className="!text-xs">Monthly View</MenuItem>
              <MenuItem value="quarter" className="!text-xs">Quarterly View</MenuItem>
              <MenuItem value="year" className="!text-xs">Yearly View</MenuItem>
              <MenuItem value="all" className="!text-xs">All Time</MenuItem>
            </Select>
            <Button
              onClick={handleRefresh}
              variant="outlined"
              color="inherit"
              className="!min-w-[40px] !border-slate-200 !text-slate-600 hover:!bg-slate-50"
            >
              <Refresh fontSize="small" />
            </Button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="flex flex-wrap justify-center gap-4 w-full">
          <StatWidget
            loading={loading}
            title="Total Spent"
            value={`€${(stats.totalAmount || 0).toLocaleString()}`}
            bgColor="bg-blue-100"
            borderColor="border-blue-300"
            textColor="text-blue-800"
          />
          <StatWidget
            loading={loading}
            title="Receipts Processed"
            value={stats.totalReceipts || 0}
            bgColor="bg-green-100"
            borderColor="border-green-300"
            textColor="text-green-800"
          />
          <StatWidget
            loading={loading}
            title="Failed / Rejected"
            value={stats.failedReceipts || 0}
            bgColor="bg-red-100"
            borderColor="border-red-300"
            textColor="text-red-800"
          />
        </div>

        {/* CHARTS STACKED VERTICALLY */}
        {!loading && (
          <div className="flex flex-col gap-6 pb-6">

            {/* 1. Trend Chart */}
            <div className="h-[400px]">
              <ChartCard title={getChartTitle()} icon={Timeline} iconColor="text-orange-500">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData || []}>
                    {/* Replaced hardcoded stroke with UI_COLORS */}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={UI_COLORS.slate100} />
                    <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="value" stroke={BRAND_COLORS.orange} fill={BRAND_COLORS.orange} fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* 2. Bar Chart */}
            <div className="h-[400px]">
              <ChartCard title="Claims by Category" icon={BarChartIcon} iconColor="text-teal-500">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData && volumeData.length > 0 ? volumeData : []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={UI_COLORS.slate100} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={50}
                      tick={<CustomXAxisTick />}
                    />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: UI_COLORS.slate50 }} />
                    <Bar dataKey="value" fill={BRAND_COLORS.teal} radius={[4, 4, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* 3. Pie Chart */}
            <div className="h-[400px]">
              <ChartCard title="Claim Status Distribution" icon={PieChartIcon} iconColor="text-blue-500">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData || []} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="85%" paddingAngle={5} cx="50%" cy="50%">
                      {(statusData || []).map((_, i: number) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", fontSize: "12px" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UserAnalytics;