import { useState, useMemo } from "react";
import {
  Search,
  UserCheck,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Building2,
  Stethoscope,
  BedDouble,
  Eye,
  Check,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  patientTypeLabel,
  patientTypeBadgeClass,
  patientTagLabel,
  patientTagBadgeClass,
  formatDateTime,
} from "@/utils";

export default function Assessment() {
  const {
    appointments,
    patients,
    currentDate,
    getPatientById,
    getChecklistByAppointment,
    getAppointmentById,
    updateAppointmentStatus,
    addChecklist,
    updateChecklist,
    advanceFlow,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [checklist, setChecklist] = useState({
    fastingHours: 0,
    bloodGlucose: 0,
    isPregnant: false,
    isLactating: false,
    recentContrastExam: "无",
    allergies: "无",
    notes: "",
  });

  const todaysAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === currentDate && a.status !== "cancelled" && a.status !== "no_show")
      .filter((a) => {
        if (!searchQuery) return true;
        const p = getPatientById(a.patientId);
        return (
          p?.name.includes(searchQuery) ||
          p?.patientNo.includes(searchQuery)
        );
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [appointments, currentDate, searchQuery, getPatientById]);

  const selectedAppointment = selectedId ? appointments.find((a) => a.id === selectedId) : null;
  const selectedPatient = selectedAppointment ? getPatientById(selectedAppointment.patientId) : null;
  const existingChecklist = selectedAppointment ? getChecklistByAppointment(selectedAppointment.id) : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const cl = getChecklistByAppointment(id);
    if (cl) {
      setChecklist({
        fastingHours: cl.fastingHours,
        bloodGlucose: cl.bloodGlucose,
        isPregnant: cl.isPregnant,
        isLactating: cl.isLactating,
        recentContrastExam: cl.recentContrastExam,
        allergies: cl.allergies,
        notes: cl.notes,
      });
    } else {
      setChecklist({
        fastingHours: 0,
        bloodGlucose: 0,
        isPregnant: false,
        isLactating: false,
        recentContrastExam: "无",
        allergies: "无",
        notes: "",
      });
    }
  };

  const handleCheckIn = (id: string) => {
    advanceFlow(id);
  };

  const handleSubmitChecklist = () => {
    if (!selectedAppointment) return;
    const passed = validateChecklist();
    if (existingChecklist) {
      updateChecklist(selectedAppointment.id, { ...checklist, passed });
    } else {
      addChecklist({
        id: `cl_${Date.now()}`,
        appointmentId: selectedAppointment.id,
        ...checklist,
        passed,
      });
    }
    if (passed) {
      const appt = getAppointmentById?.(selectedAppointment.id);
      if (appt?.status === "pending") {
        advanceFlow(selectedAppointment.id);
      }
    }
  };

  const validateChecklist = (): boolean => {
    if (checklist.isPregnant) return false;
    if (checklist.bloodGlucose > 11) return false;
    if (checklist.fastingHours < 4) return false;
    return true;
  };

  const warnings = useMemo(() => {
    const list: { type: "error" | "warn" | "info"; message: string }[] = [];
    if (checklist.fastingHours > 0 && checklist.fastingHours < 4) {
      list.push({ type: "error", message: `禁食时间不足（仅${checklist.fastingHours}小时，要求≥4小时）` });
    }
    if (checklist.bloodGlucose > 11) {
      list.push({ type: "error", message: `血糖值过高（${checklist.bloodGlucose}mmol/L，建议≤11）` });
    }
    if (checklist.isPregnant) {
      list.push({ type: "error", message: "妊娠患者禁止进行PET-CT检查" });
    }
    if (checklist.isLactating) {
      list.push({ type: "warn", message: "哺乳期患者需停止哺乳24小时以上" });
    }
    if (checklist.recentContrastExam !== "无") {
      list.push({ type: "warn", message: `近期有增强检查史：${checklist.recentContrastExam}，需确认间隔足够` });
    }
    if (checklist.allergies !== "无") {
      list.push({ type: "info", message: `过敏史：${checklist.allergies}` });
    }
    return list;
  }, [checklist]);

  const isFormValid = checklist.fastingHours > 0 && checklist.bloodGlucose > 0;

  return (
    <div className="grid grid-cols-12 gap-5 h-full animate-fade-in">
      <div className="col-span-5 card flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-medical-600" />
              <h3 className="text-sm font-semibold text-slate-900">今日到检列表</h3>
            </div>
            <span className="badge bg-medical-50 text-medical-700 border border-medical-100">
              共 {todaysAppointments.length} 人
            </span>
          </div>
          <div className="mt-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索姓名或病案号"
              className="input pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
          {todaysAppointments.map((a) => {
            const p = getPatientById(a.patientId);
            if (!p) return null;
            const cl = getChecklistByAppointment(a.id);
            const isSelected = selectedId === a.id;
            return (
              <div
                key={a.id}
                onClick={() => handleSelect(a.id)}
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  isSelected ? "bg-medical-50/50" : "hover:bg-slate-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full shrink-0",
                        a.status === "completed" ? "bg-emerald-500" :
                        a.status === "in_progress" ? "bg-amber-500" :
                        a.status === "checked_in" ? "bg-sky-500" : "bg-slate-300"
                      )} />
                      <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                      <span className={cn("badge border text-[10px]", patientTypeBadgeClass[p.patientType])}>
                        {patientTypeLabel[p.patientType]}
                      </span>
                      {cl && (
                        <span className={cn(
                          "badge text-[10px] border",
                          cl.passed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {cl.passed ? "评估通过" : "评估不通过"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {a.timeSlot}
                      <span className="text-slate-300">|</span>
                      <span className="font-mono">{p.patientNo}</span>
                      <span className="text-slate-300">|</span>
                      {a.examSubtype}
                    </div>
                    {p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className={cn("badge border text-[10px]", patientTagBadgeClass[tag])}>
                            {patientTagLabel[tag]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {a.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckIn(a.id);
                      }}
                      className="btn-primary text-xs py-1 px-2.5 shrink-0"
                    >
                      <UserCheck className="w-3 h-3" />
                      签到
                    </button>
                  )}
                  {isSelected && <ChevronRight className="w-4 h-4 text-medical-600 shrink-0 mt-1" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="col-span-7 card overflow-hidden flex flex-col">
        {!selectedPatient || !selectedAppointment ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ClipboardCheck className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">请从左侧列表选择患者进行评估</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-medical-50 to-sky-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-slate-900">{selectedPatient.name}</h2>
                      <span className={cn("badge border", patientTypeBadgeClass[selectedPatient.patientType])}>
                        {patientTypeLabel[selectedPatient.patientType]}
                      </span>
                      <span className="badge bg-slate-100 text-slate-600 border border-slate-200">
                        {selectedPatient.age}岁 · {selectedPatient.gender}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-xs">{selectedPatient.patientNo}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPatient.phone}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPatient.department}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPatient.doctor}
                      </div>
                      {selectedPatient.bedNo && (
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                          床位：{selectedPatient.bedNo}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">预约时段</div>
                  <div className="text-lg font-mono font-semibold text-medical-700">{selectedAppointment.timeSlot}</div>
                  <div className="mt-1 text-xs text-slate-500">{selectedAppointment.examSubtype}</div>
                </div>
              </div>
              {selectedPatient.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedPatient.tags.map((tag) => (
                    <span key={tag} className={cn("badge border px-2.5 py-1", patientTagBadgeClass[tag])}>
                      <AlertTriangle className="w-3 h-3" />
                      {patientTagLabel[tag]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">
              {existingChecklist && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-sm text-emerald-800">
                    该患者已于 {formatDateTime(existingChecklist.notes ? undefined : undefined)} 完成前置核查
                    {existingChecklist.notes && `，备注：${existingChecklist.notes}`}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-medical-600" />
                  前置核查清单
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="label flex items-center justify-between">
                      <span>禁食时长（小时）</span>
                      <span className="text-xs text-slate-400">要求 ≥ 4h</span>
                    </label>
                    <input
                      type="number"
                      value={checklist.fastingHours || ""}
                      onChange={(e) => setChecklist({ ...checklist, fastingHours: Number(e.target.value) })}
                      className="input"
                      placeholder="如：6"
                    />
                    {checklist.fastingHours > 0 && checklist.fastingHours < 4 && (
                      <p className="text-xs text-rose-600">禁食时间不足</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="label flex items-center justify-between">
                      <span>血糖值（mmol/L）</span>
                      <span className="text-xs text-slate-400">建议 ≤ 11</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={checklist.bloodGlucose || ""}
                      onChange={(e) => setChecklist({ ...checklist, bloodGlucose: Number(e.target.value) })}
                      className="input"
                      placeholder="如：5.6"
                    />
                    {checklist.bloodGlucose > 11 && (
                      <p className="text-xs text-rose-600">血糖值过高</p>
                    )}
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-5">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="text-sm font-medium text-slate-900">是否妊娠</div>
                        <div className="text-xs text-slate-500">PET-CT 辐射对胎儿有影响</div>
                      </div>
                      <button
                        onClick={() => setChecklist({ ...checklist, isPregnant: !checklist.isPregnant })}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative",
                          checklist.isPregnant ? "bg-rose-500" : "bg-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                          checklist.isPregnant ? "left-[22px]" : "left-0.5"
                        )} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div>
                        <div className="text-sm font-medium text-slate-900">是否哺乳期</div>
                        <div className="text-xs text-slate-500">需停止哺乳 24h 以上</div>
                      </div>
                      <button
                        onClick={() => setChecklist({ ...checklist, isLactating: !checklist.isLactating })}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative",
                          checklist.isLactating ? "bg-amber-500" : "bg-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                          checklist.isLactating ? "left-[22px]" : "left-0.5"
                        )} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">近期增强检查史</label>
                    <input
                      value={checklist.recentContrastExam}
                      onChange={(e) => setChecklist({ ...checklist, recentContrastExam: e.target.value })}
                      className="input"
                      placeholder="如：1周前CT增强，若无请填'无'"
                    />
                  </div>
                  <div>
                    <label className="label">药物/食物过敏史</label>
                    <input
                      value={checklist.allergies}
                      onChange={(e) => setChecklist({ ...checklist, allergies: e.target.value })}
                      className="input"
                      placeholder="如：青霉素过敏，若无请填'无'"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="label">评估备注</label>
                    <textarea
                      value={checklist.notes}
                      onChange={(e) => setChecklist({ ...checklist, notes: e.target.value })}
                      className="input min-h-[80px] resize-none"
                      placeholder="其他需要特别说明的情况..."
                    />
                  </div>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">核查提示</h4>
                  {warnings.map((w, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 p-3 rounded-lg border",
                        w.type === "error" && "bg-rose-50 border-rose-200",
                        w.type === "warn" && "bg-amber-50 border-amber-200",
                        w.type === "info" && "bg-sky-50 border-sky-200"
                      )}
                    >
                      {w.type === "error" ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : w.type === "warn" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Eye className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      )}
                      <span className={cn(
                        "text-sm",
                        w.type === "error" && "text-rose-800",
                        w.type === "warn" && "text-amber-800",
                        w.type === "info" && "text-sky-800"
                      )}>
                        {w.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button className="btn-secondary">
                <Eye className="w-4 h-4" />
                打印知情同意书
              </button>
              <button
                onClick={handleSubmitChecklist}
                disabled={!isFormValid}
                className={cn(
                  "btn-primary",
                  validateChecklist() ? "" : "!bg-rose-600 hover:!bg-rose-700 focus:!ring-rose-500"
                )}
              >
                <Check className="w-4 h-4" />
                {validateChecklist() ? "确认通过" : "评估不通过 · 提交记录"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
