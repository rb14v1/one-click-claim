// src/pages/AdminDashboard.tsx
import { useState } from "react";
import { Button, Select, MenuItem, Pagination, ButtonGroup } from "@mui/material";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Bar, BarChart, PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { Refresh, TableView, BarChart as BarChartIcon } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { MainLayout } from "../layout/MainLayout";
import { CHART_COLOR_ARRAY, BRAND_COLORS } from "../constants/colors";


// IMPORT SHARED COMPONENTS & HOOKS
import { StatWidget, ChartCard, UniversalTable } from '../components/AnalyticsPrimitives';
import { DownloadMenu } from '../components/DownloadMenu';
import { useAdminData } from '../hooks/useAdminData';

type StatusItem = {
  name: string;
  value: number;
};

export const AdminDashboard = () => {
  const navigate = useNavigate();

  // UI State
  const [range, setRange] = useState("day");
  const [catPage, setCatPage] = useState(1);
  const [isTableView, setIsTableView] = useState(false);

  const { data, loading, refetch } = useAdminData(range, catPage);

  return (
    <MainLayout>
      <Toaster position="top-right" />
      <div className="bg-[#f8fafc] w-full min-h-screen p-6 flex flex-col gap-6">

        {/* --- HEADER --- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center flex-wrap gap-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Analytics Overview</h1>
            <p className="text-xs text-slate-400 font-medium">System performance and user metrics</p>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <ButtonGroup size="small" className="bg-white">
              <Button
                onClick={() => setIsTableView(false)}
                variant={!isTableView ? "contained" : "outlined"}
                className={!isTableView ? "!bg-teal-600 !text-white !border-teal-600" : "!text-teal-600 !border-teal-600 hover:!bg-teal-50"}
              >
                <BarChartIcon fontSize="small" />
              </Button>
              <Button
                onClick={() => setIsTableView(true)}
                variant={isTableView ? "contained" : "outlined"}
                className={isTableView ? "!bg-teal-600 !text-white !border-teal-600" : "!text-teal-600 !border-teal-600 hover:!bg-teal-50"}
              >
                <TableView fontSize="small" />
              </Button>
            </ButtonGroup>

            <Select
              size="small"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="min-w-[120px] !text-xs bg-white"
            >
              <MenuItem value="day" className="!text-xs">Daily View</MenuItem>
              <MenuItem value="week" className="!text-xs">Weekly View</MenuItem>
              <MenuItem value="month" className="!text-xs">Monthly View</MenuItem>
              <MenuItem value="quarter" className="!text-xs">Quarterly View</MenuItem>
              <MenuItem value="all" className="!text-xs">Yearly View</MenuItem>
            </Select>

            <Button
              variant="outlined"
              size="small"
              onClick={refetch}
              className="!text-slate-500 !border-slate-200 hover:!bg-slate-50"
            >
              <Refresh fontSize="small" />
            </Button>

            <DownloadMenu
              data={data}
              range={range}
              kpiElementId="kpi-row"
              chartsElementId="dashboard-charts"
            />

            <Button variant="contained" className="!bg-teal-600 hover:!bg-teal-700 !text-xs !normal-case !font-bold" onClick={() => navigate("/uploadpage")}>
              New Upload
            </Button>
          </div>
        </div>

        {/* --- KPI ROW --- */}
        <div id="kpi-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          <StatWidget loading={loading} title="Total Claims" value={data.kpis.total_claims || 0} bgColor="bg-gray-50" borderColor="border-gray-200" textColor="text-gray-600" />
          <StatWidget loading={loading} title="Receipts Processed" value={data.kpis.total_receipts || 0} bgColor="bg-green-50" borderColor="border-green-200" textColor="text-green-800" />
          <StatWidget loading={loading} title="Pending Approval" value={data.kpis.pending_count || 0} bgColor="bg-amber-50" borderColor="border-amber-200" textColor="text-amber-800" />
          <StatWidget loading={loading} title="Rejected" value={data.kpis.rejected_count || 0} bgColor="bg-red-50" borderColor="border-red-200" textColor="text-red-800" />
          <StatWidget loading={loading} title="Total Spent" value={`€${(data.kpis.total_amount || 0).toLocaleString()}`} bgColor="bg-blue-50" borderColor="border-blue-200" textColor="text-blue-800" />
        </div>

        {/* --- CHARTS GRID --- */}
        
        <div id="dashboard-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
          <ChartCard title="Claim Status Distribution" subtitle="Approval pipeline">
            {isTableView ? (
              <UniversalTable headers={["Status", "Count"]} rows={data.status.map((d: any) => [d.name, d.value])} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.status} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="80%">
                    {(data.status as StatusItem[] || []).map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
                      />
                    ))}

                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Category Analysis" subtitle="Spend by category" footer={<Pagination size="small" count={data.categories.total_pages} page={catPage} onChange={(_, v) => setCatPage(v)} color="primary" />}>
            {isTableView ? (
              <UniversalTable headers={["Category", "Receipts", "Total"]} rows={data.categories.items.map((c: any) => [c.category, c.receipt_count, `€${c.total_amount}`])} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categories.items}>
                  <XAxis dataKey="category" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="total_amount" fill={BRAND_COLORS.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Claims Volume" subtitle="Processing count">
            {isTableView ? (
              <UniversalTable headers={["Date", "Count"]} rows={data.volume.map((d: any) => [d.label, d.value])} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.volume}>
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill={BRAND_COLORS.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Financial Spend (€)" subtitle="Expenditure trend">
            {isTableView ? (
              <UniversalTable headers={["Date", "Amount"]} rows={data.finance.map((d: any) => [d.label, `€${d.value}`])} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.finance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip cursor={{ stroke: 'none' }} />
                  <Area type="monotone" dataKey="value" stroke={BRAND_COLORS.orange} fill={BRAND_COLORS.orange} fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Top 10 Users" subtitle="Activity breakdown">
            {isTableView ? (
              <UniversalTable headers={["User", "Claims", "Claimed date", "Last Login"]} rows={data.topUsers.map((u: any) => [u.username, u.claims_count, u.date_joined, u.last_login])} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topUsers} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="username" type="category" fontSize={10} width={70} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="claims_count" fill={BRAND_COLORS.blue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Active Users Trend" subtitle="Submitters over time">
            {isTableView ? (
              <UniversalTable headers={["Date", "Users"]} rows={data.users.map((d: any) => [d.label, d.value])} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.users}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={BRAND_COLORS.blue} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;