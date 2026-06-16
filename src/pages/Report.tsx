import { useState, useMemo } from "react";
import {
  FileText,
  Clock,
  User,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Download,
  Bell,
  CalendarDays,
  Phone,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  reportStatusLabel,
  reportStatusBadgeClass,
  reportUrgencyLabel,
  patientTypeLabel,
  patientTypeBadgeClass,
  formatDateTime,
} from "@/utils";
import type { ReportStatus } from "@/types";

export default function Report() {
  const {
    reports,
    appointments,
    getPatientById,
    getAppointmentById,
    updateReportStatus,
  } = useAppStore();

  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      const a = getAppointmentById(r.appointmentId);
      const p = a ? getPatientById(a.patientId) : null;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p?.name.toLowerCase().includes(q) ||
          r.radiologist.toLowerCase().includes(q) ||
          a?.sourceNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reports, filterStatus, searchQuery, getAppointmentById, getPatientById]);

  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    reporting: reports.filter((r) => r.status === "reporting").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    published: reports.filter((r) => r.status === "published").length,
    urgent: reports.filter((r) => r.urgency === "urgent" && r.status !== "published").length,
  }), [reports]);

  const statusFlow: ReportStatus[] = ["pending", "reporting", "reviewed", "published"];

  const advanceStatus = (id: string, current: ReportStatus) => {
    const idx = statusFlow.indexOf(current);
    if (idx < statusFlow.length - 1) {
      updateReportStatus(id, statusFlow[idx + 1]);
    }
  };

  const generatePickupTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: "待报告", value: stats.pending, color: "slate", urgent: false },
          { label: "报告中", value: stats.reporting, color: "amber", urgent: false },
          { label: "已审核", value: stats.reviewed, color: "sky", urgent: false },
          { label: "已发布", value: stats.published, color: "emerald", urgent: false },
          { label: "加急件", value: stats.urgent, color: "rose", urgent: true },
          { label: "工作总量", value: stats.total, color: "medical", urgent: false },
        ].map((s) => {
          const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
            slate: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
            amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
            sky: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
            emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
            rose: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
            medical: { bg: "bg-medical-50", text: "text-medical-700", dot: "bg-medical-500" },
          };
          const c = colorMap[s.color];
          return (
            <div key={s.label} className="card p-4">
              <div className="flex items-center justify-between">
                <div className={cn("text-xs font-medium", c.text)}>{s.label}</div>
                {s.urgent && s.value > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold font-mono", c.text)}>{s.value}</span>
                <span className={cn("w-2 h-2 rounded-full", c.dot)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            {(["all", "pending", "reporting", "reviewed", "published"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  filterStatus === s ? "bg-white text-medical-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {s === "all" ? "全部" : reportStatusLabel[s]}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索患者姓名/医师/来源号"
              className="input pl-9 w-64"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-medical-600" />
            <h3 className="text-sm font-semibold text-slate-900">影像医师工作列表</h3>
          </div>
          <span className="text-xs text-slate-500">共 {filteredReports.length} 条记录</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 w-10"></th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3">患者信息</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3">检查项目</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3">报告医师</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3">优先级</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3">状态</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-3">取报告时间</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((r) => {
                const a = getAppointmentById(r.appointmentId);
                const p = a ? getPatientById(a.patientId) : null;
                if (!p || !a) return null;
                const isExpanded = expandedId === r.id;
                const isUrgent = r.urgency === "urgent";
                return (
                  <>
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors cursor-pointer",
                        isUrgent && r.status !== "published" && "bg-rose-50/30"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <td className="px-5 py-3">
                        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                            <User className="w-4.5 h-4.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">{p.name}</span>
                              <span className={cn("badge border text-[10px]", patientTypeBadgeClass[p.patientType])}>
                                {patientTypeLabel[p.patientType]}
                              </span>
                              {isUrgent && r.status !== "published" && (
                                <span className="flex items-center gap-0.5 text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  加急
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{p.patientNo} · {p.age}{p.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-sm text-slate-900">{a.examType}</div>
                        <div className="text-xs text-slate-500">{a.examSubtype}</div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-sm text-slate-900">{r.radiologist}</div>
                        <div className="text-xs text-slate-500">影像诊断医师</div>
                      </td>
                      <td className="px-2 py-3">
                        <span className={cn(
                          "badge border",
                          isUrgent
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          {reportUrgencyLabel[r.urgency]}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className={cn("badge border", reportStatusBadgeClass[r.status])}>
                          {r.status === "reporting" && <Clock className="w-3 h-3 animate-pulse" />}
                          {r.status === "published" && <CheckCircle2 className="w-3 h-3" />}
                          {reportStatusLabel[r.status]}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        {r.pickupTime ? (
                          <div>
                            <div className="text-sm font-mono text-slate-900">{formatDateTime(r.pickupTime, "date")}</div>
                            <div className="text-xs text-slate-500">{formatDateTime(r.pickupTime, "time")}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">待发布</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded-md text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-colors" title="查看影像">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-md text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-colors" title="下载报告">
                            <Download className="w-4 h-4" />
                          </button>
                          {r.status !== "published" && (
                            <button
                              onClick={() => advanceStatus(r.id, r.status)}
                              className="ml-1 btn-primary text-xs py-1 px-2.5"
                            >
                              <Send className="w-3 h-3" />
                              {statusFlow[statusFlow.indexOf(r.status) + 1]
                                ? `转${reportStatusLabel[statusFlow[statusFlow.indexOf(r.status) + 1]]}`
                                : "完成"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">患者详细信息</h4>
                              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">联系电话</span>
                                  <span className="font-mono text-slate-900 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {p.phone}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">申请科室</span>
                                  <span className="text-slate-900">{p.department}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">申请医师</span>
                                  <span className="text-slate-900">{p.doctor}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">来源号</span>
                                  <span className="font-mono text-slate-900">{a.sourceNo}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">检查信息</h4>
                              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">检查日期</span>
                                  <span className="font-mono text-slate-900 flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3 text-slate-400" />
                                    {a.date} {a.timeSlot}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">检查类型</span>
                                  <span className="text-slate-900">{a.examType}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">检查项目</span>
                                  <span className="text-slate-900">{a.examSubtype}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">示踪剂批次</span>
                                  <span className="font-mono text-slate-900">{a.tracerBatch ?? "—"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">取报告通知</h4>
                              <div className="p-4 rounded-lg bg-gradient-to-br from-medical-50 to-sky-50 border border-medical-100 space-y-3">
                                <div className="flex items-start gap-2">
                                  <Bell className="w-4 h-4 text-medical-600 shrink-0 mt-0.5" />
                                  <div className="text-xs text-slate-700">
                                    {r.status === "published" ? (
                                      <>报告已发布，取报告通知已自动发送至患者手机。</>
                                    ) : (
                                      <>报告发布后系统将自动计算取报告时间并短信通知患者。</>
                                    )}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-white/80 border border-medical-100/50">
                                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    短信内容预览
                                  </div>
                                  <div className="text-xs text-slate-700 leading-relaxed">
                                    【核医学科】{p.name}您好，您的{a.examSubtype}检查报告将于
                                    <span className="font-mono text-medical-700 font-semibold"> {formatDateTime(generatePickupTime(), "date")} </span>
                                    后可取，请携带就诊卡到自助机或登记窗口领取。
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && (
          <div className="px-5 py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">暂无符合条件的报告记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
