import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Activity,
  Calendar,
  Target,
  ChevronDown,
  CalendarDays,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/utils";

const HEATMAP_COLORS = ["#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0284C7"];

const PIE_COLORS = ["#0369A1", "#0891B2", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

type HeatmapRow = {
  day: string;
  [key: string]: string | number;
};

export default function Statistics() {
  const { statistics, appointments, currentDate, isReportTimeout, isReportWarning, reports, getAppointmentById } = useAppStore();
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const noShowCount = useMemo(
    () => appointments.filter((a) => a.date === currentDate && a.status === "no_show").length,
    [appointments, currentDate]
  );
  const totalToday = useMemo(
    () => appointments.filter((a) => a.date === currentDate).length,
    [appointments, currentDate]
  );

  const reportKpis = useMemo(() => {
    let reportTimeoutCount = 0;
    let reportWarningCount = 0;
    let reportOnTime = 0;
    let totalReports = 0;
    appointments.forEach((a) => {
      const hasReport = reports.some((r) => r.appointmentId === a.id);
      if (hasReport) {
        totalReports++;
        if (isReportTimeout(a.id)) reportTimeoutCount++;
        else if (isReportWarning(a.id)) reportWarningCount++;
        else reportOnTime++;
      }
    });
    const onTimeRate = totalReports > 0 ? Math.round((reportOnTime / totalReports) * 100) : 0;
    const timeoutRate = totalReports > 0 ? Math.round((reportTimeoutCount / totalReports) * 100) : 0;
    return { reportTimeoutCount, reportWarningCount, reportOnTime, totalReports, onTimeRate, timeoutRate };
  }, [appointments, reports, isReportTimeout, isReportWarning]);

  const heatmapData = useMemo<HeatmapRow[]>(() => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const hours = [8, 9, 10, 11, 14, 15, 16];
    return days.map((day) => ({
      day,
      ...Object.fromEntries(
        hours.map((h) => [
          h.toString(),
          Math.floor(Math.random() * 5),
        ])
      ),
    }));
  }, []);

  const reportStatusDistribution = useMemo(() => {
    return [
      { name: "按时完成", value: reportKpis.reportOnTime },
      { name: "临近时限", value: reportKpis.reportWarningCount },
      { name: "超时未出", value: reportKpis.reportTimeoutCount },
    ];
  }, [reportKpis]);

  const kpiCards = [
    {
      label: "爽约率",
      value: `${statistics.noShowRate}%`,
      trend: -1.2,
      trendLabel: "较上周",
      icon: Users,
      color: "rose",
      detail: `今日爽约 ${noShowCount}/${totalToday} 人`,
    },
    {
      label: "平均候检时长",
      value: `${statistics.avgWaitingMinutes}分钟`,
      trend: -5,
      trendLabel: "较上周",
      icon: Clock,
      color: "amber",
      detail: "目标 ≤ 60分钟",
    },
    {
      label: "设备利用率",
      value: `${statistics.deviceUtilization}%`,
      trend: 3.8,
      trendLabel: "较上周",
      icon: Activity,
      color: "medical",
      detail: `今日检查 ${statistics.dailyExams} 例`,
    },
    {
      label: "周检查总量",
      value: `${statistics.weeklyExams}例`,
      trend: 12,
      trendLabel: "较上周",
      icon: Calendar,
      color: "emerald",
      detail: `日均约 ${Math.round(statistics.weeklyExams / 7)} 例`,
    },
    {
      label: "报告按时率",
      value: `${reportKpis.onTimeRate}%`,
      trend: 2.1,
      trendLabel: "较上周",
      icon: CheckCircle2,
      color: "emerald",
      detail: `按时 ${reportKpis.reportOnTime}/${reportKpis.totalReports} 份`,
    },
    {
      label: "报告超时率",
      value: `${reportKpis.timeoutRate}%`,
      trend: -0.8,
      trendLabel: "较上周",
      icon: AlertTriangle,
      color: "rose",
      detail: `超时 ${reportKpis.reportTimeoutCount} 份，风险 ${reportKpis.reportWarningCount} 份`,
    },
  ];

  const getTrendColor = (trend: number, inverse = false) => {
    const positive = inverse ? trend < 0 : trend > 0;
    return positive ? "text-emerald-600" : trend === 0 ? "text-slate-500" : "text-rose-600";
  };

  const getTrendIcon = (trend: number, inverse = false) => {
    const positive = inverse ? trend < 0 : trend > 0;
    return positive ? TrendingUp : trend === 0 ? Target : TrendingDown;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
            {(["week", "month", "quarter"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  period === p
                    ? "bg-white text-medical-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {p === "week" ? "本周" : p === "month" ? "本月" : "本季度"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BarChart3 className="w-4 h-4" />
          数据更新时间：{new Date().toLocaleString("zh-CN")}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          const TrendIcon = getTrendIcon(k.trend, k.color === "rose" || k.color === "amber");
          const colorMap: Record<string, string> = {
            rose: "from-rose-500 to-rose-700",
            amber: "from-amber-500 to-orange-500",
            medical: "from-medical-500 to-medical-700",
            emerald: "from-emerald-500 to-emerald-700",
          };
          const bgMap: Record<string, string> = {
            rose: "bg-rose-50 text-rose-700",
            amber: "bg-amber-50 text-amber-700",
            medical: "bg-medical-50 text-medical-700",
            emerald: "bg-emerald-50 text-emerald-700",
          };
          return (
            <div key={k.label} className="card p-5 hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className={cn("text-xs font-medium", bgMap[k.color].split(" ")[1])}>{k.label}</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-slate-900">{k.value}</span>
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      getTrendColor(k.trend, k.color === "rose" || k.color === "amber")
                    )}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      <span>{Math.abs(k.trend)}%</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{k.detail}</div>
                </div>
                <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", colorMap[k.color])}>
                  <Icon className="w-5.5 h-5.5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-medical-600" />
                月度检查量趋势
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">近6个月检查量变化</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-medical-600" />
                <span className="text-slate-600">检查量</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500" />
                <span className="text-slate-600">趋势线</span>
              </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statistics.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`${value} 例`, "检查量"]}
                  labelStyle={{ fontWeight: 600, color: "#0F172A" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fill="url(#colorCount)"
                  dot={{ r: 5, fill: "#0284C7", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, fill: "#0284C7", strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-4 card p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-medical-600" />
              检查类型分布
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">本月各检查类型占比</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statistics.examTypeDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {statistics.examTypeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} 例`, name]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-7 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-medical-600" />
                时段检查量分布
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">今日各时段检查人数</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-sm bg-medical-600" />
              检查人次
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.hourlyDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickFormatter={(v) => `${v}:00`}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`${value} 人次`, "检查量"]}
                  labelFormatter={(label) => `${label}:00-${Number(label) + 1}:00`}
                />
                <Bar
                  dataKey="count"
                  fill="#0284C7"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-5 card p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-medical-600" />
              高峰拥堵热力图
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">一周各时段拥挤程度</p>
          </div>
          <div className="space-y-2">
            <div className="flex gap-1 pl-12 mb-1">
              {[8, 9, 10, 11, 14, 15, 16].map((h) => (
                <div key={h} className="flex-1 text-center text-[10px] text-slate-500 font-medium">
                  {h}:00
                </div>
              ))}
            </div>
            {heatmapData.map((row) => (
              <div key={row.day} className="flex items-center gap-1">
                <div className="w-10 text-xs text-slate-600 font-medium">{row.day}</div>
                {[8, 9, 10, 11, 14, 15, 16].map((h) => {
                  const val = (row[h.toString()] as number) || 0;
                  return (
                    <div
                      key={`${row.day}-${h}`}
                      className="flex-1 h-9 rounded-md transition-all hover:scale-105 cursor-pointer"
                      style={{ backgroundColor: HEATMAP_COLORS[val] }}
                      title={`${row.day} ${h}:00 - ${val + 1}级拥堵`}
                    />
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-500">空闲</span>
              {HEATMAP_COLORS.map((c, i) => (
                <div key={i} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[10px] text-slate-500">拥挤</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
