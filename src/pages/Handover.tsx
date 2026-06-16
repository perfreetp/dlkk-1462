import { useState, useMemo } from "react";
import {
  Handshake,
  User,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  FileText,
  Syringe,
  ClipboardCheck,
  Scan,
  LogOut,
  X,
  Info,
  History,
  ListTodo,
  Calendar,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  flowNodeLabel,
  patientTypeLabel,
  patientTypeBadgeClass,
  formatDateTime,
  reportUrgencyLabel,
} from "@/utils";
import type { FlowNodeType, ShiftType } from "@/types";

const NODE_RESPONSIBLE: Record<FlowNodeType, string> = {
  check_in: "登记护士",
  blood_draw: "采血护士",
  injection: "注射技师",
  rest: "候检护士",
  scan: "扫描技师",
  rescan: "扫描技师",
  discharge: "登记护士",
};

const NODE_ICON: Record<FlowNodeType, typeof ClipboardCheck> = {
  check_in: ClipboardCheck,
  blood_draw: FileText,
  injection: Syringe,
  rest: Clock,
  scan: Scan,
  rescan: Scan,
  discharge: LogOut,
};

const SHIFT_LABEL: Record<ShiftType, string> = {
  morning: "白班",
  afternoon: "午班",
  evening: "夜班",
};

const SHIFT_NEXT: Record<ShiftType, ShiftType> = {
  morning: "afternoon",
  afternoon: "evening",
  evening: "morning",
};

const FLOW_NODE_ORDER: FlowNodeType[] = [
  "check_in",
  "blood_draw",
  "injection",
  "rest",
  "scan",
  "rescan",
  "discharge",
];

type ListMode = "pending" | "history";

export default function Handover() {
  const {
    appointments,
    currentDate,
    handoverRecords,
    getPatientById,
    getFlowNodesByAppointment,
    getChecklistByAppointment,
    getInjectionByAppointment,
    getEffectiveCurrentNode,
    createHandoverRecord,
    isReportTimeout,
    isReportWarning,
    getReportByAppointment,
  } = useAppStore();

  const [selectedShift, setSelectedShift] = useState<ShiftType>("morning");
  const [listMode, setListMode] = useState<ListMode>("pending");
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);
  const [handoverNote, setHandoverNote] = useState("");
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);

  const todaysPatients = useMemo(() => {
    return appointments
      .filter((a) => a.date === currentDate && a.status !== "cancelled" && a.status !== "no_show")
      .map((a) => {
        const p = getPatientById(a.patientId);
        const effective = getEffectiveCurrentNode(a.id);
        const checklist = getChecklistByAppointment(a.id);
        const injection = getInjectionByAppointment(a.id);
        const report = getReportByAppointment(a.id);

        const currentNode = effective?.node;
        const isCompleted = effective?.phase === "all_done";
        const isInProgress = effective?.phase === "in_progress";
        const isPendingNext = effective?.phase === "pending_next";

        const currentIdx = currentNode
          ? FLOW_NODE_ORDER.indexOf(currentNode.nodeType)
          : -1;
        const nextNodeType: FlowNodeType | null =
          isInProgress && currentIdx >= 0 && currentIdx < FLOW_NODE_ORDER.length - 1
            ? FLOW_NODE_ORDER[currentIdx + 1]
            : isPendingNext && currentIdx >= 0 && currentIdx < FLOW_NODE_ORDER.length - 1
              ? FLOW_NODE_ORDER[currentIdx + 1]
              : null;

        const hasAbnormal = checklist && !checklist.passed;
        const abnormalNote = checklist?.notes || "";

        const timeout = report ? isReportTimeout(report.id) : false;
        const warning = !timeout && report ? isReportWarning(report.id) : false;

        const todoActions: string[] = [];
        if (isPendingNext && currentNode) {
          todoActions.push(`推进至「${flowNodeLabel[currentNode.nodeType]}」环节（点击开始）`);
        }
        if (isInProgress && currentNode) {
          todoActions.push(`完成「${flowNodeLabel[currentNode.nodeType]}」环节操作`);
        }
        if (nextNodeType && (isInProgress || isPendingNext)) {
          todoActions.push(`后续衔接「${flowNodeLabel[nextNodeType]}」`);
        }
        if (timeout) {
          todoActions.push("报告已超时，优先处理并与诊断医师沟通");
        } else if (warning) {
          todoActions.push("报告即将超时，提醒诊断医师跟进");
        }
        if (hasAbnormal) {
          todoActions.push("关注核查异常情况，必要时与医师沟通");
        }
        if (todoActions.length === 0 && isCompleted) {
          todoActions.push("流程已完成，等待报告最终签发");
        }

        return {
          appointment: a,
          patient: p,
          currentNode,
          nextNodeType,
          isInProgress,
          isPendingNext,
          isCompleted,
          hasAbnormal,
          abnormalNote,
          todoActions,
          injection,
          report,
          timeout,
          warning,
        };
      })
      .filter((item) => item.patient)
      .sort((a, b) => a.appointment.timeSlot.localeCompare(b.appointment.timeSlot));
  }, [
    appointments,
    currentDate,
    getPatientById,
    getFlowNodesByAppointment,
    getChecklistByAppointment,
    getInjectionByAppointment,
    getEffectiveCurrentNode,
    isReportTimeout,
    isReportWarning,
    getReportByAppointment,
  ]);

  const pendingItems = todaysPatients.filter(
    (item) => !item.isCompleted
  );

  const abnormalCount = todaysPatients.filter((item) => item.hasAbnormal).length;
  const timeoutCount = todaysPatients.filter((item) => item.timeout).length;
  const warningCount = todaysPatients.filter((item) => item.warning).length;

  const latestRecord = handoverRecords[0];

  const buildTodoPayload = () => {
    return pendingItems.map(({ appointment, patient, currentNode, nextNodeType, todoActions, hasAbnormal, abnormalNote }) => ({
      appointmentId: appointment.id,
      patientName: patient?.name || "",
      currentNode: currentNode?.nodeType || "check_in",
      nextNode: nextNodeType || undefined,
      actions: todoActions,
      hasAbnormal,
      abnormalNote,
    }));
  };

  const handleHandover = () => {
    setShowHandoverConfirm(true);
    setHandoverNote("");
  };

  const confirmHandover = () => {
    const record = createHandoverRecord({
      fromShift: selectedShift,
      toShift: SHIFT_NEXT[selectedShift],
      fromOperator: "李护士",
      toOperator: "王护士",
      note: handoverNote,
      items: buildTodoPayload(),
    });
    setLastRecordId(record.id);
    setTimeout(() => {
      setShowHandoverConfirm(false);
      setSelectedShift(SHIFT_NEXT[selectedShift]);
      setListMode("history");
      setLastRecordId(null);
    }, 1500);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center">
              <Handshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">交接班管理</h2>
              <p className="text-sm text-slate-500">
                查看 {currentDate} 患者节点、待办事项、异常情况并进行交接
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(["morning", "afternoon", "evening"] as ShiftType[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedShift(s);
                    setListMode("pending");
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    selectedShift === s
                      ? "bg-white text-medical-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {SHIFT_LABEL[s]}
                </button>
              ))}
            </div>
            <button
              onClick={handleHandover}
              disabled={pendingItems.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Handshake className="w-4 h-4" />
              交接给 {SHIFT_LABEL[SHIFT_NEXT[selectedShift]]}
            </button>
          </div>
        </div>

        {latestRecord && (
          <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between">
            <div className="flex items-start gap-2">
              <History className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-sky-700">
                  最近一次交接记录 · {formatDateTime(latestRecord.createdAt)}
                </div>
                <div className="text-xs text-sky-600 mt-0.5">
                  {SHIFT_LABEL[latestRecord.fromShift]}（{latestRecord.fromOperator}）→
                  {SHIFT_LABEL[latestRecord.toShift]}（{latestRecord.toOperator}）·
                  {latestRecord.items.length} 项待办 ·
                  {latestRecord.note ? ` 备注：${latestRecord.note}` : " 无备注"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setListMode("history")}
              className="text-xs font-medium text-sky-700 hover:text-sky-800 px-2 py-1 rounded-md bg-sky-100/50 hover:bg-sky-100"
            >
              查看详情
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">今日患者</span>
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{todaysPatients.length}</span>
            <span className="text-sm text-slate-400">人次</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">待处理</span>
            <ListTodo className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-600">{pendingItems.length}</span>
            <span className="text-sm text-slate-400">位</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">核查异常</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-rose-600">{abnormalCount}</span>
            <span className="text-sm text-slate-400">例</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">报告超时</span>
            <Clock className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-rose-600">{timeoutCount}</span>
            <span className="text-sm text-slate-400">例</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">风险预警</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-600">{warningCount}</span>
            <span className="text-sm text-slate-400">例</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setListMode("pending")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  listMode === "pending"
                    ? "bg-white text-medical-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <ListTodo className="w-3.5 h-3.5" />
                待办交接清单
                <span className="badge bg-amber-100 text-amber-700 text-[9px] ml-0.5">
                  {pendingItems.length}
                </span>
              </button>
              <button
                onClick={() => setListMode("history")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  listMode === "history"
                    ? "bg-white text-medical-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <History className="w-3.5 h-3.5" />
                历史交接记录
                <span className="badge bg-slate-100 text-slate-600 text-[9px] ml-0.5">
                  {handoverRecords.length}
                </span>
              </button>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            {listMode === "pending"
              ? `共 ${pendingItems.length} 位待处理患者`
              : `共 ${handoverRecords.length} 次交接`}
          </span>
        </div>

        {listMode === "pending" ? (
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-thin">
            {pendingItems.map(({ appointment, patient, currentNode, nextNodeType, isInProgress, isPendingNext, hasAbnormal, abnormalNote, todoActions, timeout, warning, report }) => {
              if (!patient) return null;
              const NodeIcon = currentNode ? NODE_ICON[currentNode.nodeType] : ClipboardCheck;
              const NextIcon = nextNodeType ? NODE_ICON[nextNodeType] : null;

              return (
                <div key={appointment.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-slate-900">{patient.name}</span>
                        <span className={cn("badge border text-[10px]", patientTypeBadgeClass[patient.patientType])}>
                          {patientTypeLabel[patient.patientType]}
                        </span>
                        {isInProgress && (
                          <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                            <Clock className="w-3 h-3 animate-pulse" />
                            进行中
                          </span>
                        )}
                        {isPendingNext && (
                          <span className="badge bg-sky-100 text-sky-700 text-[10px]">
                            <ListTodo className="w-3 h-3" />
                            待进入
                          </span>
                        )}
                        {timeout && (
                          <span className="badge bg-rose-100 text-rose-700 text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            报告超时
                          </span>
                        )}
                        {!timeout && warning && (
                          <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            即将超时
                          </span>
                        )}
                        {report && (
                          <span className={cn(
                            "badge border text-[10px]",
                            report.urgency === "urgent" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-600 border-slate-200"
                          )}>
                            {reportUrgencyLabel[report.urgency]}
                          </span>
                        )}
                        {hasAbnormal && (
                          <span className="badge bg-rose-50 text-rose-700 border border-rose-100 text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            异常
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {patient.age}{patient.gender} · {appointment.examSubtype} · {appointment.timeSlot}
                      </div>

                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                          isInProgress ? "bg-amber-50 text-amber-700" :
                          isPendingNext ? "bg-sky-50 text-sky-700" :
                          "bg-emerald-50 text-emerald-700"
                        )}>
                          <NodeIcon className="w-3.5 h-3.5" />
                          {isPendingNext ? "待进入：" : isInProgress ? "当前：" : "已完成："}
                          {flowNodeLabel[currentNode?.nodeType || "discharge"]}
                        </div>
                        {NextIcon && nextNodeType && (
                          <>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              <ArrowRight className="w-3.5 h-3.5" />
                              下一步：{flowNodeLabel[nextNodeType]}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        {currentNode && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            当前责任：{NODE_RESPONSIBLE[currentNode.nodeType]}
                          </span>
                        )}
                        {nextNodeType && (
                          <span className="flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            下一责任：{NODE_RESPONSIBLE[nextNodeType]}
                          </span>
                        )}
                      </div>

                      {todoActions.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-sky-50/50 border border-sky-100">
                          <div className="text-xs font-semibold text-sky-700 mb-1.5 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" />
                            待办动作
                          </div>
                          <ul className="space-y-1">
                            {todoActions.map((action, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1 shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {hasAbnormal && abnormalNote && (
                        <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-100">
                          <div className="text-xs font-semibold text-rose-700 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            异常备注
                          </div>
                          <p className="text-xs text-rose-600">{abnormalNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {pendingItems.length === 0 && (
              <div className="px-5 py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">当前班次患者全部完成，交接清单为空</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-thin">
            {handoverRecords.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">暂无历史交接记录</p>
              </div>
            ) : (
              handoverRecords.map((rec) => {
                const isLatest = rec.id === lastRecordId;
                return (
                  <div
                    key={rec.id}
                    className={cn(
                      "p-5 transition-colors",
                      isLatest && "bg-emerald-50/50 animate-pulse"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          isLatest
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
                            : "bg-gradient-to-br from-slate-300 to-slate-500"
                        )}>
                          <Handshake className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">
                              {SHIFT_LABEL[rec.fromShift]} → {SHIFT_LABEL[rec.toShift]}
                            </span>
                            {isLatest && (
                              <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                最新
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(rec.createdAt)} · {rec.fromOperator} 交给 {rec.toOperator}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-medical-700">{rec.items.length}</div>
                        <div className="text-[10px] text-slate-500">交接事项</div>
                      </div>
                    </div>

                    {rec.note && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" />
                          交接备注
                        </div>
                        <p className="text-xs text-amber-700">{rec.note}</p>
                      </div>
                    )}

                    <div className="mt-3 space-y-1.5">
                      {rec.items.map((item, idx) => {
                        const NodeIcon = NODE_ICON[item.currentNode];
                        return (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2">
                            <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                              <NodeIcon className="w-3.5 h-3.5 text-medical-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-slate-800">{item.patientName}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {flowNodeLabel[item.currentNode]}
                                  {item.nextNode && ` → ${flowNodeLabel[item.nextNode]}`}
                                </span>
                                {item.hasAbnormal && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                                    异常
                                  </span>
                                )}
                              </div>
                              <ul className="mt-1.5 space-y-0.5">
                                {item.actions.map((a, i) => (
                                  <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1">
                                    <span className="w-1 h-1 rounded-full bg-slate-300 mt-1 shrink-0" />
                                    {a}
                                  </li>
                                ))}
                              </ul>
                              {item.abnormalNote && (
                                <div className="mt-1 text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded">
                                  备注：{item.abnormalNote}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showHandoverConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-medical-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  {lastRecordId ? "交接成功" : `确认交接给${SHIFT_LABEL[SHIFT_NEXT[selectedShift]]}`}
                </h3>
              </div>
              <button
                onClick={() => !lastRecordId && setShowHandoverConfirm(false)}
                disabled={!!lastRecordId}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {lastRecordId ? (
                <div className="py-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div className="text-lg font-semibold text-slate-900 mb-1">
                    交接成功！{pendingItems.length} 项已移交
                  </div>
                  <div className="text-sm text-slate-500">
                    即将进入 {SHIFT_LABEL[SHIFT_NEXT[selectedShift]]} 视图
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-sky-50 border border-sky-100">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-sky-700">
                        将把当前 {pendingItems.length} 位未完成的患者、
                        待办事项和异常备注完整记录并移交给下一班次。
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label">交接班备注</label>
                    <textarea
                      value={handoverNote}
                      onChange={(e) => setHandoverNote(e.target.value)}
                      placeholder="请输入需要特别说明的事项，如患者特殊安排、设备状态、药物余量等..."
                      className="input h-24 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="text-xs text-slate-500">待办</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{pendingItems.length}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50">
                      <div className="text-xs text-amber-600">异常</div>
                      <div className="text-lg font-bold text-amber-600 mt-1">{abnormalCount}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-rose-50">
                      <div className="text-xs text-rose-500">超时+预警</div>
                      <div className="text-lg font-bold text-rose-600 mt-1">
                        {timeoutCount + warningCount}
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {buildTodoPayload().slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-50 text-xs">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-700 font-medium">{item.patientName}</span>
                        <span className="text-slate-400 ml-auto font-mono text-[10px]">
                          {flowNodeLabel[item.currentNode]}
                          {item.nextNode && ` → ${flowNodeLabel[item.nextNode]}`}
                        </span>
                      </div>
                    ))}
                    {buildTodoPayload().length > 5 && (
                      <div className="text-center text-xs text-slate-400 py-1">
                        ... 还有 {buildTodoPayload().length - 5} 项
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {!lastRecordId && (
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowHandoverConfirm(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button onClick={confirmHandover} className="btn-primary">
                  <Handshake className="w-4 h-4" />
                  确认交接
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
