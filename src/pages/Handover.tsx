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
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  flowNodeLabel,
  patientTypeLabel,
  patientTypeBadgeClass,
  formatDateTime,
  getMinutesElapsed,
} from "@/utils";
import type { FlowNodeType } from "@/types";

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

const FLOW_NODE_ORDER: FlowNodeType[] = [
  "check_in",
  "blood_draw",
  "injection",
  "rest",
  "scan",
  "rescan",
  "discharge",
];

export default function Handover() {
  const {
    appointments,
    currentDate,
    patients,
    flowNodes,
    checklists,
    getPatientById,
    getFlowNodesByAppointment,
    getCurrentFlowNode,
    getChecklistByAppointment,
    getInjectionByAppointment,
  } = useAppStore();

  const [selectedShift, setSelectedShift] = useState<"morning" | "afternoon" | "evening">("morning");
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);
  const [handoverNote, setHandoverNote] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  const todaysPatients = useMemo(() => {
    return appointments
      .filter((a) => a.date === currentDate && a.status !== "cancelled" && a.status !== "no_show")
      .map((a) => {
        const p = getPatientById(a.patientId);
        const nodes = getFlowNodesByAppointment(a.id);
        const currentNode = getCurrentFlowNode(a.id);
        const checklist = getChecklistByAppointment(a.id);
        const injection = getInjectionByAppointment(a.id);

        const currentIndex = currentNode
          ? FLOW_NODE_ORDER.indexOf(currentNode.nodeType)
          : -1;
        const nextNodeType =
          currentIndex >= 0 && currentIndex < FLOW_NODE_ORDER.length - 1
            ? FLOW_NODE_ORDER[currentIndex + 1]
            : null;

        const hasAbnormal = checklist && !checklist.passed;
        const abnormalNote = checklist?.notes || "";

        const todoActions: string[] = [];
        if (currentNode?.status === "in_progress") {
          todoActions.push(`完成「${flowNodeLabel[currentNode.nodeType]}」环节`);
        }
        if (nextNodeType) {
          todoActions.push(`推进至「${flowNodeLabel[nextNodeType]}」环节`);
        }
        if (hasAbnormal) {
          todoActions.push("关注异常情况，必要时与医师沟通");
        }

        return {
          appointment: a,
          patient: p,
          currentNode,
          nextNodeType,
          hasAbnormal,
          abnormalNote,
          todoActions,
          injection,
          nodes,
        };
      })
      .filter((item) => item.patient)
      .sort((a, b) => a.appointment.timeSlot.localeCompare(b.appointment.timeSlot));
  }, [
    appointments,
    currentDate,
    getPatientById,
    getFlowNodesByAppointment,
    getCurrentFlowNode,
    getChecklistByAppointment,
    getInjectionByAppointment,
  ]);

  const pendingCount = todaysPatients.filter(
    (item) => item.currentNode && item.currentNode.status !== "completed"
  ).length;

  const abnormalCount = todaysPatients.filter((item) => item.hasAbnormal).length;

  const handleHandover = () => {
    setShowHandoverConfirm(true);
    setHandoverNote("");
    setHandoverSuccess(false);
  };

  const confirmHandover = () => {
    setHandoverSuccess(true);
    setTimeout(() => {
      setShowHandoverConfirm(false);
      setHandoverSuccess(false);
    }, 2000);
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
              <p className="text-sm text-slate-500">按患者查看当前节点、待办事项和异常情况，一键交接</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(["morning", "afternoon", "evening"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedShift(s)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    selectedShift === s
                      ? "bg-white text-medical-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {s === "morning" ? "白班" : s === "afternoon" ? "午班" : "夜班"}
                </button>
              ))}
            </div>
            <button onClick={handleHandover} className="btn-primary">
              <Handshake className="w-4 h-4" />
              一键交接
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
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
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
            <span className="text-sm text-slate-400">位</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">异常情况</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-rose-600">{abnormalCount}</span>
            <span className="text-sm text-slate-400">例</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">已完成</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-600">
              {todaysPatients.length - pendingCount}
            </span>
            <span className="text-sm text-slate-400">位</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-medical-600" />
              <h3 className="text-sm font-semibold text-slate-900">患者交接清单</h3>
            </div>
            <span className="text-xs text-slate-500">
              共 {todaysPatients.length} 位患者，{pendingCount} 位待处理
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-thin">
          {todaysPatients.map(({ appointment, patient, currentNode, nextNodeType, hasAbnormal, abnormalNote, todoActions }) => {
            if (!patient) return null;
            const NodeIcon = currentNode ? NODE_ICON[currentNode.nodeType] : ClipboardCheck;
            const isCompleted = currentNode?.status === "completed";
            const isInProgress = currentNode?.status === "in_progress";

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
                      {isCompleted && (
                        <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          已完成
                        </span>
                      )}
                      {hasAbnormal && (
                        <span className="badge bg-rose-100 text-rose-700 text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          异常
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {patient.age}{patient.gender} · {appointment.examSubtype} · {appointment.timeSlot}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                        isCompleted ? "bg-emerald-50 text-emerald-700" :
                        isInProgress ? "bg-amber-50 text-amber-700" :
                        "bg-slate-50 text-slate-600"
                      )}>
                        <NodeIcon className="w-3.5 h-3.5" />
                        当前：{flowNodeLabel[currentNode?.nodeType || "check_in"]}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                      {nextNodeType ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-700">
                          <ArrowRight className="w-3.5 h-3.5" />
                          下一步：{flowNodeLabel[nextNodeType]}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          全部完成
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        责任：{NODE_RESPONSIBLE[currentNode?.nodeType || "check_in"]}
                      </span>
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
        </div>
      </div>

      {showHandoverConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-medical-600" />
                <h3 className="text-base font-semibold text-slate-900">确认交接班</h3>
              </div>
              <button
                onClick={() => setShowHandoverConfirm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {handoverSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="text-base font-semibold text-slate-900 mb-1">交接成功</div>
                  <div className="text-sm text-slate-500">
                    {pendingCount} 位待处理患者已移交下一班
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-sky-50 border border-sky-100">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-sky-700">
                        将把当前 {pendingCount} 位未完成的患者交接给下一班次，
                        包含所有待办事项和异常备注。
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label">交接班备注</label>
                    <textarea
                      value={handoverNote}
                      onChange={(e) => setHandoverNote(e.target.value)}
                      placeholder="请输入需要特别说明的事项..."
                      className="input h-24 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="text-xs text-slate-500">交接患者</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">{pendingCount}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50">
                      <div className="text-xs text-amber-600">待处理</div>
                      <div className="text-lg font-bold text-amber-600 mt-1">{pendingCount}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-rose-50">
                      <div className="text-xs text-rose-500">异常</div>
                      <div className="text-lg font-bold text-rose-600 mt-1">{abnormalCount}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {!handoverSuccess && (
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
