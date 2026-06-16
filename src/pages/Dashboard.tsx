import { useMemo, useState } from "react";
import {
  Monitor,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ChevronRight,
  Wrench,
  Play,
  Pause,
  X,
  FileText,
  Syringe,
  ClipboardCheck,
  Calendar,
  Phone,
  MapPin,
  Stethoscope,
  Timer,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  flowNodeLabel,
  flowNodeStatusClass,
  patientTypeLabel,
  patientTypeBadgeClass,
  appointmentStatusLabel,
  appointmentStatusBadgeClass,
  deviceStatusLabel,
  deviceStatusDotClass,
  patientTagLabel,
  patientTagBadgeClass,
  reportStatusLabel,
  reportStatusBadgeClass,
  reportUrgencyLabel,
  checklistSourceLabel,
  checklistSourceBadgeClass,
  formatDateTime,
  getMinutesElapsed,
  formatDuration,
} from "@/utils";
import type { FlowNodeType, FlowNode, Appointment, Patient } from "@/types";

const nodeOrder: FlowNodeType[] = ["check_in", "blood_draw", "injection", "rest", "scan", "rescan", "discharge"];

export default function Dashboard() {
  const {
    appointments,
    currentDate,
    devices,
    flowNodes,
    getPatientById,
    getFlowNodesByAppointment,
    getAppointmentById,
    getChecklistByAppointment,
    getInjectionByAppointment,
    getReportByAppointment,
    advanceFlow,
  } = useAppStore();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const selectedAppointment = selectedAppointmentId ? getAppointmentById(selectedAppointmentId) : null;
  const selectedPatient = selectedAppointment ? getPatientById(selectedAppointment.patientId) : null;
  const selectedNodes = selectedAppointmentId
    ? getFlowNodesByAppointment(selectedAppointmentId).sort(
        (a, b) => nodeOrder.indexOf(a.nodeType) - nodeOrder.indexOf(b.nodeType)
      )
    : [];
  const selectedChecklist = selectedAppointmentId ? getChecklistByAppointment(selectedAppointmentId) : null;
  const selectedInjection = selectedAppointmentId ? getInjectionByAppointment(selectedAppointmentId) : null;
  const selectedReport = selectedAppointmentId ? getReportByAppointment(selectedAppointmentId) : null;

  const openDrawer = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setTimeout(() => setSelectedAppointmentId(null), 300);
  };

  const todaysAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === currentDate && a.status !== "cancelled" && a.status !== "no_show")
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [appointments, currentDate]);

  const stats = useMemo(() => {
    const t = todaysAppointments;
    return {
      total: t.length,
      checkedIn: t.filter((a) => a.status === "checked_in" || a.status === "in_progress").length,
      inProgress: t.filter((a) => a.status === "in_progress").length,
      completed: t.filter((a) => a.status === "completed").length,
      pending: t.filter((a) => a.status === "pending").length,
    };
  }, [todaysAppointments]);

  const alerts = useMemo(() => {
    const list: { id: string; type: "warn" | "error"; message: string; patientName: string }[] = [];
    todaysAppointments.forEach((a) => {
      const p = getPatientById(a.patientId);
      if (!p) return;
      const nodes = getFlowNodesByAppointment(a.id);
      const restNode = nodes.find((n) => n.nodeType === "rest");
      if (restNode?.status === "in_progress" && restNode.startTime) {
        const elapsed = getMinutesElapsed(restNode.startTime);
        if (elapsed > 75) {
          list.push({
            id: `alert_${a.id}_rest`,
            type: "warn",
            patientName: p.name,
            message: `静卧等待超时（已${formatDuration(elapsed)}，建议尽快安排扫描）`,
          });
        }
      }
      const pendingNodes = nodes.filter((n) => n.status === "in_progress");
      pendingNodes.forEach((n) => {
        if (n.startTime) {
          const elapsed = getMinutesElapsed(n.startTime);
          if (elapsed > 45 && n.nodeType !== "rest") {
            list.push({
              id: `alert_${a.id}_${n.nodeType}`,
              type: "error",
              patientName: p.name,
              message: `${flowNodeLabel[n.nodeType]}节点超时（已${formatDuration(elapsed)}）`,
            });
          }
        }
      });
    });
    return list;
  }, [todaysAppointments, getPatientById, getFlowNodesByAppointment]);

  const handleAdvance = (appointmentId: string, skipRescan = true) => {
    advanceFlow(appointmentId, { skipRescan });
  };

  const getCurrentNode = (nodes: FlowNode[]): FlowNode | undefined => {
    return nodes.find((n) => n.status === "in_progress");
  };

  const getNextNode = (nodes: FlowNode[]): FlowNode | undefined => {
    const currentIdx = nodes.findIndex((n) => n.status === "in_progress");
    if (currentIdx !== -1) {
      for (let i = currentIdx + 1; i < nodeOrder.length; i++) {
        const n = nodes.find((x) => x.nodeType === nodeOrder[i]);
        if (n && n.status === "pending") return n;
      }
    } else {
      for (let i = 0; i < nodeOrder.length; i++) {
        const n = nodes.find((x) => x.nodeType === nodeOrder[i]);
        if (n && n.status === "pending") return n;
      }
    }
    return undefined;
  };

  const renderTimeline = () => {
    if (!selectedAppointment || !selectedPatient) return null;

    return (
      <div className="space-y-4">
        {selectedNodes.map((node, idx) => {
          const isLast = idx === selectedNodes.length - 1;
          return (
            <div key={node.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0",
                  flowNodeStatusClass[node.status],
                  node.status === "in_progress" && "ring-2 ring-offset-2 ring-amber-200"
                )}>
                  {node.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : node.status === "in_progress" ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : node.status === "skipped" ? (
                    <span className="text-xs text-slate-400">跳</span>
                  ) : (
                    <span className="text-[10px] font-medium">{flowNodeLabel[node.nodeType][0]}</span>
                  )}
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-0.5 flex-1 mt-1",
                    node.status === "completed" ? "bg-emerald-300" : "bg-slate-200"
                  )} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{flowNodeLabel[node.nodeType]}</span>
                    <span className={cn(
                      "badge border text-[10px]",
                      node.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      node.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      node.status === "skipped" ? "bg-slate-50 text-slate-500 border-slate-200" :
                      "bg-slate-50 text-slate-400 border-slate-200"
                    )}>
                      {node.status === "completed" ? "已完成" :
                       node.status === "in_progress" ? "进行中" :
                       node.status === "skipped" ? "已跳过" : "待执行"}
                    </span>
                  </div>
                  {node.startTime && (
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDateTime(node.startTime, "time")}
                      {node.endTime && ` → ${formatDateTime(node.endTime, "time")}`}
                    </span>
                  )}
                </div>
                {node.operator && (
                  <div className="text-xs text-slate-500 mt-0.5">操作人：{node.operator}</div>
                )}
                {node.status === "in_progress" && node.startTime && (
                  <div className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    已进行 {formatDuration(getMinutesElapsed(node.startTime))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "今日预约", value: stats.total, icon: Users, color: "medical" },
          { label: "待签到", value: stats.pending, icon: Clock, color: "slate" },
          { label: "进行中", value: stats.inProgress, icon: Play, color: "amber" },
          { label: "已完成", value: stats.completed, icon: CheckCircle2, color: "emerald" },
          { label: "预警数", value: alerts.length, icon: AlertTriangle, color: alerts.length > 0 ? "rose" : "slate" },
        ].map((s) => {
          const Icon = s.icon;
          const colorMap: Record<string, string> = {
            medical: "from-medical-500 to-medical-700 text-white",
            slate: "from-slate-500 to-slate-700 text-white",
            amber: "from-amber-500 to-orange-500 text-white",
            emerald: "from-emerald-500 to-emerald-700 text-white",
            rose: "from-rose-500 to-rose-700 text-white",
          };
          const bgMap: Record<string, string> = {
            medical: "bg-medical-50 text-medical-700",
            slate: "bg-slate-50 text-slate-700",
            amber: "bg-amber-50 text-amber-700",
            emerald: "bg-emerald-50 text-emerald-700",
            rose: "bg-rose-50 text-rose-700",
          };
          return (
            <div key={s.label} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className={cn("text-xs font-medium", bgMap[s.color].split(" ")[1])}>{s.label}</div>
                  <div className="mt-1.5 text-3xl font-bold font-mono text-slate-900">{s.value}</div>
                </div>
                <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", colorMap[s.color])}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <div className="card p-4 border-rose-200 bg-rose-50/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-semibold text-rose-800">异常预警</h3>
            <span className="badge bg-rose-100 text-rose-700 border border-rose-200">{alerts.length} 条</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-rose-100">
                <span className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  a.type === "error" ? "bg-rose-500 animate-pulse" : "bg-amber-500"
                )} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">{a.patientName}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{a.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-5">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-medical-600" />
                  <h3 className="text-sm font-semibold text-slate-900">检查流程追踪</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {nodeOrder.map((n, i) => (
                    <div key={n} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-200" />
                      <span className="text-slate-500">{flowNodeLabel[n]}</span>
                      {i < nodeOrder.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
              <div className="divide-y divide-slate-100">
                {todaysAppointments.map((a) => {
                  const p = getPatientById(a.patientId);
                  if (!p) return null;
                  const nodes = getFlowNodesByAppointment(a.id);
                  return (
                    <div
                      key={a.id}
                      className="px-5 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => openDrawer(a.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-28 shrink-0">
                          <div className="text-xs text-slate-400">预约时段</div>
                          <div className="text-sm font-mono font-semibold text-slate-900">{a.timeSlot}</div>
                        </div>
                        <div className="w-36 shrink-0 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.age}{p.gender} · {a.examSubtype}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={cn("badge border text-[10px]", patientTypeBadgeClass[p.patientType])}>
                            {patientTypeLabel[p.patientType]}
                          </span>
                          {p.tags.slice(0, 1).map((t) => (
                            <span key={t} className={cn("badge border text-[10px]", patientTagBadgeClass[t])}>
                              {patientTagLabel[t]}
                            </span>
                          ))}
                        </div>
                        <div className="flex-1 flex items-center gap-1">
                          {nodeOrder.map((nodeType) => {
                            const node = nodes.find((n) => n.nodeType === nodeType);
                            const status = node?.status ?? "pending";
                            const isCurrent = status === "in_progress";
                            return (
                              <div key={nodeType} className="flex-1 flex items-center">
                                <div className={cn(
                                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
                                  flowNodeStatusClass[status],
                                  isCurrent && "ring-2 ring-offset-2 ring-amber-200 scale-110"
                                )}>
                                  {status === "completed" ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : isCurrent ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <span className="text-[10px]">{flowNodeLabel[nodeType][0]}</span>
                                  )}
                                </div>
                                {nodeType !== "discharge" && (
                                  <div className={cn(
                                    "flex-1 h-0.5 mx-0.5",
                                    status === "completed" ? "bg-emerald-300" : "bg-slate-200"
                                  )} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="w-24 shrink-0 text-right">
                          <span className={cn("badge border", appointmentStatusBadgeClass[a.status])}>
                            {appointmentStatusLabel[a.status]}
                          </span>
                        </div>
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.status !== "completed" && (
                            getNextNode(nodes)?.nodeType === "rescan" ? (
                              <>
                                <button
                                  onClick={() => handleAdvance(a.id, true)}
                                  className="btn-secondary text-xs py-1 px-2"
                                  title="跳过补扫"
                                >
                                  跳过补扫
                                </button>
                                <button
                                  onClick={() => handleAdvance(a.id, false)}
                                  className="btn-primary text-xs py-1 px-2"
                                  title="进入补扫"
                                >
                                  <Play className="w-3 h-3" />
                                  补扫
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAdvance(a.id)}
                                className="btn-primary text-xs py-1 px-2.5"
                              >
                                <Play className="w-3 h-3" />
                                推进
                              </button>
                            )
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-5">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-medical-600" />
                <h3 className="text-sm font-semibold text-slate-900">设备状态</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {devices.map((d) => {
                const currentPatient = d.currentAppointmentId
                  ? getPatientById(getAppointmentById(d.currentAppointmentId)?.patientId ?? "")
                  : null;
                return (
                  <div key={d.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("status-dot", deviceStatusDotClass[d.status])} />
                          <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {d.model}
                        </div>
                      </div>
                      <span className={cn(
                        "badge border",
                        d.status === "running" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        d.status === "maintenance" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-rose-50 text-rose-700 border-rose-200"
                      )}>
                        {deviceStatusLabel[d.status]}
                      </span>
                    </div>
                    {d.status === "running" && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                          <span>当前检查：{currentPatient?.name ?? "等待患者"}</span>
                          <span>{d.currentProgress ?? 0}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              "bg-gradient-to-r from-medical-500 to-medical-700"
                            )}
                            style={{ width: `${d.currentProgress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500">今日利用率</span>
                      <span className="font-mono font-semibold text-medical-700">{d.utilizationToday}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-medical-600" />
                  <h3 className="text-sm font-semibold text-slate-900">即将到检</h3>
                </div>
                <span className="text-xs text-slate-500">下一个时段</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {todaysAppointments
                .filter((a) => a.status === "pending")
                .slice(0, 4)
                .map((a) => {
                  const p = getPatientById(a.patientId);
                  if (!p) return null;
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-slate-400">时段</span>
                        <span className="text-xs font-mono font-semibold text-slate-700">{a.timeSlot.split("-")[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{p.name}</div>
                        <div className="text-xs text-slate-500">{a.examSubtype}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn("badge border text-[10px]", patientTypeBadgeClass[p.patientType])}>
                          {patientTypeLabel[p.patientType]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {todaysAppointments.filter((a) => a.status === "pending").length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  暂无待签到患者
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={closeDrawer}
          />
          <div className="relative w-[480px] bg-white shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">患者详情</h3>
                <p className="text-xs text-slate-500 mt-0.5">全流程信息一览</p>
              </div>
              <button
                onClick={closeDrawer}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {selectedAppointment && selectedPatient && (
                <div className="p-6 space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-medical-50 to-sky-50 border border-medical-100">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-slate-900">{selectedPatient.name}</span>
                        <span className={cn("badge border text-[10px]", patientTypeBadgeClass[selectedPatient.patientType])}>
                          {patientTypeLabel[selectedPatient.patientType]}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {selectedPatient.age}岁 · {selectedPatient.gender} · {selectedPatient.patientNo}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedPatient.tags.map((t) => (
                          <span key={t} className={cn("badge border text-[10px]", patientTagBadgeClass[t])}>
                            {patientTagLabel[t]}
                          </span>
                        ))}
                        {selectedPatient.tags.length === 0 && (
                          <span className="text-xs text-slate-400">无特殊标记</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">联系电话</span>
                      <span className="font-mono text-slate-900 ml-auto">{selectedPatient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">申请医生</span>
                      <span className="text-slate-900 ml-auto">{selectedPatient.doctor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">申请科室</span>
                      <span className="text-slate-900 ml-auto">{selectedPatient.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">检查日期</span>
                      <span className="font-mono text-slate-900 ml-auto">{selectedAppointment.date}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">检查项目</span>
                      <span className="text-slate-900 ml-auto">{selectedAppointment.examType} - {selectedAppointment.examSubtype}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">预约时段</span>
                      <span className="font-mono text-slate-900 ml-auto">{selectedAppointment.timeSlot}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-medical-600" />
                        <h4 className="text-sm font-semibold text-slate-900">前置核查结果</h4>
                      </div>
                      {selectedChecklist && (
                        <span className={cn("badge border text-[10px]", checklistSourceBadgeClass[selectedChecklist.source])}>
                          {checklistSourceLabel[selectedChecklist.source]}
                        </span>
                      )}
                    </div>
                    {selectedChecklist ? (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">禁食时长</span>
                            <span className={cn(
                              "font-semibold",
                              selectedChecklist.fastingHours >= 4 ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {selectedChecklist.fastingHours} 小时
                              {selectedChecklist.fastingHours >= 4 ? " ✓" : " ✗"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">血糖值</span>
                            <span className={cn(
                              "font-semibold",
                              selectedChecklist.bloodGlucose <= 11 ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {selectedChecklist.bloodGlucose} mmol/L
                              {selectedChecklist.bloodGlucose <= 11 ? " ✓" : " ✗"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">妊娠状态</span>
                            <span className={cn(
                              "font-semibold",
                              !selectedChecklist.isPregnant ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {selectedChecklist.isPregnant ? "是 ✗" : "否 ✓"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">哺乳状态</span>
                            <span className={cn(
                              "font-semibold",
                              !selectedChecklist.isLactating ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {selectedChecklist.isLactating ? "是" : "否"}
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-slate-500 shrink-0">近期增强检查：</span>
                            <span className="text-slate-700">{selectedChecklist.recentContrastExam}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-slate-500 shrink-0">过敏史：</span>
                            <span className="text-slate-700">{selectedChecklist.allergies}</span>
                          </div>
                          {selectedChecklist.notes && (
                            <div className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">备注：</span>
                              <span className="text-slate-700">{selectedChecklist.notes}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <span className="text-xs text-slate-500">
                            {selectedChecklist.updatedAt
                              ? `最后更新：${formatDateTime(selectedChecklist.updatedAt)}`
                              : `创建时间：${formatDateTime(selectedChecklist.createdAt)}`
                            }
                          </span>
                          <span className={cn(
                            "badge border text-xs",
                            selectedChecklist.passed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {selectedChecklist.passed ? "核查通过" : "核查未通过"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
                        暂无核查记录
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Syringe className="w-4 h-4 text-medical-600" />
                      <h4 className="text-sm font-semibold text-slate-900">注射记录</h4>
                    </div>
                    {selectedInjection ? (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">示踪剂类型</span>
                            <span className="font-semibold text-slate-900">{selectedInjection.tracerType}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">批次号</span>
                            <span className="font-mono text-slate-700">{selectedInjection.tracerBatch}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">注射活度</span>
                            <span className="font-semibold text-slate-900">{selectedInjection.tracerActivity} MBq</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">注射部位</span>
                            <span className="text-slate-700">{selectedInjection.injectionSite}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">注射人员</span>
                            <span className="text-slate-700">{selectedInjection.injector}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">注射时间</span>
                            <span className="font-mono text-slate-700">{formatDateTime(selectedInjection.injectTime, "time")}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-slate-500">不良反应</span>
                          <span className={cn(
                            "font-medium",
                            selectedInjection.adverseReaction === "无" ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {selectedInjection.adverseReaction}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
                        暂无注射记录
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-medical-600" />
                      <h4 className="text-sm font-semibold text-slate-900">流程时间轴</h4>
                    </div>
                    {renderTimeline()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-medical-600" />
                      <h4 className="text-sm font-semibold text-slate-900">报告状态</h4>
                    </div>
                    {selectedReport ? (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">优先级</span>
                            <span className={cn(
                              "badge border text-[10px]",
                              selectedReport.urgency === "urgent"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {reportUrgencyLabel[selectedReport.urgency]}
                            </span>
                          </div>
                          <span className={cn("badge border", reportStatusBadgeClass[selectedReport.status])}>
                            {reportStatusLabel[selectedReport.status]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">影像医师</span>
                          <span className="text-slate-700">{selectedReport.radiologist}</span>
                        </div>
                        {selectedReport.pickupTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">取报告时间</span>
                            <span className="font-mono text-slate-700">{formatDateTime(selectedReport.pickupTime)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
                        暂无报告记录
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
