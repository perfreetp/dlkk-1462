import { useState, useMemo } from "react";
import {
  Syringe,
  BedDouble,
  Plus,
  X,
  Check,
  Clock,
  AlertTriangle,
  User,
  Timer,
  Search,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  patientTypeLabel,
  patientTypeBadgeClass,
  patientTagLabel,
  patientTagBadgeClass,
  formatDateTime,
  getMinutesElapsed,
  formatDuration,
} from "@/utils";

export default function Injection() {
  const {
    appointments,
    currentDate,
    restBeds,
    injectionRecords,
    getPatientById,
    getInjectionByAppointment,
    getFlowNodesByAppointment,
    addInjectionRecord,
    occupyBed,
    releaseBed,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<"inject" | "rest">("inject");
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [injectForm, setInjectForm] = useState({
    tracerType: "18F-FDG",
    tracerBatch: "FDG-20260616-A",
    tracerActivity: 370,
    injector: "张技师",
    injectionSite: "左肘正中静脉",
    adverseReaction: "无",
  });

  const todaysWaiting = useMemo(() => {
    return appointments
      .filter((a) => a.date === currentDate && a.status !== "cancelled" && a.status !== "no_show")
      .filter((a) => {
        const nodes = getFlowNodesByAppointment?.(a.id) ?? [];
        const injectionNode = nodes.find((n) => n.nodeType === "injection");
        return injectionNode?.status === "pending" || injectionNode?.status === "in_progress";
      })
      .filter((a) => {
        if (!searchQuery) return true;
        const p = getPatientById(a.patientId);
        return p?.name.includes(searchQuery);
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [appointments, currentDate, searchQuery, getPatientById, getFlowNodesByAppointment]);

  const occupiedBedsByZone = useMemo(() => {
    const zones: Record<string, typeof restBeds> = {};
    restBeds.forEach((b) => {
      if (!zones[b.zone]) zones[b.zone] = [];
      zones[b.zone].push(b);
    });
    return zones;
  }, [restBeds]);

  const handleInject = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowInjectModal(true);
  };

  const handleSubmitInject = () => {
    if (!selectedAppointmentId) return;
    addInjectionRecord({
      id: `ir_${Date.now()}`,
      appointmentId: selectedAppointmentId,
      ...injectForm,
      injectTime: new Date().toISOString(),
    });
    setShowInjectModal(false);
    setSelectedAppointmentId(null);
  };

  const bedStats = useMemo(() => ({
    total: restBeds.length,
    occupied: restBeds.filter((b) => b.occupied).length,
  }), [restBeds]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("inject")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "inject"
                  ? "bg-white text-medical-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Syringe className="w-4 h-4" />
              注射登记
              <span className="badge bg-medical-100 text-medical-700 text-[10px]">
                {todaysWaiting.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("rest")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "rest"
                  ? "bg-white text-medical-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BedDouble className="w-4 h-4" />
              静卧区管理
              <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                {bedStats.occupied}/{bedStats.total}
              </span>
            </button>
          </div>
          <div className="ml-auto relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索患者姓名"
              className="input pl-9 w-56"
            />
          </div>
        </div>
      </div>

      {activeTab === "inject" ? (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-7 card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-medical-600" />
                  <h3 className="text-sm font-semibold text-slate-900">待注射患者</h3>
                </div>
                <span className="text-xs text-slate-500">完成采血后可进行注射</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {todaysWaiting.map((a) => {
                const p = getPatientById(a.patientId);
                if (!p) return null;
                const rec = getInjectionByAppointment(a.id);
                const hasInjected = !!rec;
                return (
                  <div key={a.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-slate-900">{p.name}</span>
                          <span className={cn("badge border", patientTypeBadgeClass[p.patientType])}>
                            {patientTypeLabel[p.patientType]}
                          </span>
                          {p.tags.map((t) => (
                            <span key={t} className={cn("badge border", patientTagBadgeClass[t])}>
                              {patientTagLabel[t]}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-mono">{p.patientNo}</span>
                          <span className="text-slate-300">•</span>
                          <span>{p.age}{p.gender}</span>
                          <span className="text-slate-300">•</span>
                          <span>{a.examSubtype}</span>
                          <span className="text-slate-300">•</span>
                          <span>预约 {a.timeSlot}</span>
                        </div>
                        {hasInjected && rec && (
                          <div className="mt-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-700">
                              已注射 {rec.tracerType} · {rec.tracerActivity}MBq · {rec.tracerBatch} · {formatDateTime(rec.injectTime, "time")}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleInject(a.id)}
                        disabled={hasInjected}
                        className={cn(
                          "btn-primary shrink-0",
                          hasInjected && "!bg-slate-200 !text-slate-500 !border-slate-200 cursor-not-allowed"
                        )}
                      >
                        {hasInjected ? (
                          <>
                            <Check className="w-4 h-4" />
                            已注射
                          </>
                        ) : (
                          <>
                            <Syringe className="w-4 h-4" />
                            注射登记
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              {todaysWaiting.length === 0 && (
                <div className="px-5 py-16 text-center">
                  <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">暂无待注射患者</p>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-5 card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Syringe className="w-4 h-4 text-medical-600" />
                <h3 className="text-sm font-semibold text-slate-900">今日注射记录</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-thin">
              {injectionRecords
                .slice()
                .sort((a, b) => b.injectTime.localeCompare(a.injectTime))
                .map((rec) => {
                  const a = appointments.find((ap) => ap.id === rec.appointmentId);
                  const p = a ? getPatientById(a.patientId) : null;
                  if (!p) return null;
                  const restElapsed = getMinutesElapsed(rec.injectTime);
                  const isOverTime = restElapsed > 70;
                  return (
                    <div key={rec.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{p.name}</span>
                            {isOverTime && (
                              <span className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                静卧超时
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 font-mono">
                            {rec.tracerBatch} · {rec.tracerActivity}MBq
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-slate-400">注射时间</div>
                          <div className="text-sm font-mono font-semibold text-slate-700">
                            {formatDateTime(rec.injectTime, "time")}
                          </div>
                          <div className={cn(
                            "mt-0.5 text-xs font-mono",
                            isOverTime ? "text-rose-600" : "text-emerald-600"
                          )}>
                            <Timer className="w-3 h-3 inline mr-1" />
                            已静卧 {formatDuration(restElapsed)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(occupiedBedsByZone).map(([zone, beds]) => {
              const occupied = beds.filter((b) => b.occupied).length;
              return (
                <div key={zone} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{zone}</span>
                    <span className="text-xs text-slate-400">静卧区</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-medical-700">{occupied}</span>
                    <span className="text-sm text-slate-400">/ {beds.length} 床</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-medical-500 to-medical-700 rounded-full transition-all"
                      style={{ width: `${(occupied / beds.length) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {Object.entries(occupiedBedsByZone).map(([zone, beds]) => (
            <div key={zone} className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-medical-600" />
                  <h3 className="text-sm font-semibold text-slate-900">{zone} 床位</h3>
                </div>
                <span className="text-xs text-slate-500">
                  {beds.filter((b) => b.occupied).length} 床占用
                </span>
              </div>
              <div className="p-5 grid grid-cols-4 gap-4">
                {beds.map((bed) => {
                  const a = bed.appointmentId ? appointments.find((ap) => ap.id === bed.appointmentId) : null;
                  const p = a ? getPatientById(a.patientId) : null;
                  const elapsed = bed.occupiedSince ? getMinutesElapsed(bed.occupiedSince) : 0;
                  const isOverTime = elapsed > 70;
                  return (
                    <div
                      key={bed.id}
                      className={cn(
                        "rounded-xl border-2 p-4 transition-all",
                        bed.occupied
                          ? isOverTime
                            ? "bg-rose-50 border-rose-200"
                            : "bg-amber-50 border-amber-200"
                          : "bg-slate-50 border-slate-200 border-dashed"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={cn(
                            "text-sm font-semibold",
                            bed.occupied ? "text-slate-900" : "text-slate-400"
                          )}>
                            {bed.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{zone}</div>
                        </div>
                        <span className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          bed.occupied ? (isOverTime ? "bg-rose-500 animate-pulse" : "bg-amber-500") : "bg-slate-300"
                        )} />
                      </div>
                      {bed.occupied && p ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-sm font-medium text-slate-900">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-slate-500" />
                            <span className={cn(
                              "text-xs font-mono",
                              isOverTime ? "text-rose-600 font-semibold" : "text-slate-600"
                            )}>
                              已静卧 {formatDuration(elapsed)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={cn("badge border text-[10px]", patientTypeBadgeClass[p.patientType])}>
                              {patientTypeLabel[p.patientType]}
                            </span>
                            {p.tags.slice(0, 1).map((t) => (
                              <span key={t} className={cn("badge border text-[10px]", patientTagBadgeClass[t])}>
                                {patientTagLabel[t]}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => releaseBed(bed.id)}
                            className="w-full mt-2 text-xs py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            安排入机 / 释放
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <div className="text-xs text-slate-400 text-center py-3">空床位</div>
                          <button
                            onClick={() => {
                              const available = todaysWaiting.find((w) => !restBeds.some((b) => b.appointmentId === w.id));
                              if (available) occupyBed(bed.id, available.id);
                            }}
                            disabled={todaysWaiting.length === 0}
                            className="w-full text-xs py-1.5 rounded-md bg-medical-600 text-white hover:bg-medical-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            安排患者
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showInjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-medical-600" />
                <h3 className="text-base font-semibold text-slate-900">注射登记</h3>
              </div>
              <button onClick={() => { setShowInjectModal(false); setSelectedAppointmentId(null); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-medical-50 border border-medical-100">
                {selectedAppointmentId && (() => {
                  const a = appointments.find((x) => x.id === selectedAppointmentId);
                  const p = a ? getPatientById(a.patientId) : null;
                  return p ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-600">{p.age}{p.gender} · {a?.examSubtype} · {p.patientNo}</div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">示踪剂类型</label>
                  <select value={injectForm.tracerType} onChange={(e) => setInjectForm({ ...injectForm, tracerType: e.target.value })} className="input">
                    <option value="18F-FDG">18F-FDG</option>
                    <option value="18F-NaF">18F-NaF</option>
                    <option value="18F-PSMA">18F-PSMA</option>
                    <option value="99mTc-MDP">99mTc-MDP</option>
                  </select>
                </div>
                <div>
                  <label className="label">示踪剂批次</label>
                  <select value={injectForm.tracerBatch} onChange={(e) => setInjectForm({ ...injectForm, tracerBatch: e.target.value })} className="input">
                    <option value="FDG-20260616-A">FDG-20260616-A</option>
                    <option value="FDG-20260616-B">FDG-20260616-B</option>
                    <option value="FDG-20260616-C">FDG-20260616-C</option>
                  </select>
                </div>
                <div>
                  <label className="label">注射活度（MBq）</label>
                  <input
                    type="number"
                    value={injectForm.tracerActivity}
                    onChange={(e) => setInjectForm({ ...injectForm, tracerActivity: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">注射人员</label>
                  <input value={injectForm.injector} onChange={(e) => setInjectForm({ ...injectForm, injector: e.target.value })} className="input" />
                </div>
                <div className="col-span-2">
                  <label className="label">注射部位</label>
                  <select value={injectForm.injectionSite} onChange={(e) => setInjectForm({ ...injectForm, injectionSite: e.target.value })} className="input">
                    <option>左肘正中静脉</option>
                    <option>右肘正中静脉</option>
                    <option>左手背静脉</option>
                    <option>右手背静脉</option>
                    <option>左贵要静脉</option>
                    <option>右贵要静脉</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">不良反应记录</label>
                  <div className="flex gap-2">
                    {["无", "轻度红晕", "疼痛", "静脉刺激", "其他"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setInjectForm({ ...injectForm, adverseReaction: r })}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-all",
                          injectForm.adverseReaction === r
                            ? r === "无"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {r !== "无" && <AlertCircle className="w-3 h-3 inline mr-1" />}
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600">系统将自动记录注射时间：</span>
                <span className="text-sm font-mono font-semibold text-medical-700">{formatDateTime(new Date().toISOString(), "time")}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => { setShowInjectModal(false); setSelectedAppointmentId(null); }} className="btn-secondary">
                取消
              </button>
              <button onClick={handleSubmitInject} className="btn-primary">
                <Save className="w-4 h-4" />
                确认注射
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
