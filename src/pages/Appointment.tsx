import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Calendar,
  Filter,
  Edit3,
  X,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Stethoscope,
} from "lucide-react";
import { useAppStore } from "@/store";
import {
  cn,
  timeSlots,
  patientTypeLabel,
  patientTypeBadgeClass,
  appointmentStatusLabel,
  appointmentStatusBadgeClass,
  appointmentStatusDotClass,
  patientTagLabel,
  patientTagBadgeClass,
  examTypes,
} from "@/utils";
import type { PatientType, PatientTag } from "@/types";

export default function Appointment() {
  const {
    appointments,
    patients,
    currentDate,
    getPatientById,
    cancelAppointment,
    rescheduleAppointment,
    addAppointment,
  } = useAppStore();

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [filterType, setFilterType] = useState<PatientType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    name: "",
    gender: "男" as "男" | "女",
    age: "",
    patientNo: "",
    patientType: "outpatient" as PatientType,
    phone: "",
    department: "",
    doctor: "",
    examType: examTypes[0].type,
    examSubtype: examTypes[0].subtypes[0],
    timeSlot: timeSlots[0],
    tags: [] as PatientTag[],
    fastingHours: 0,
    bloodGlucose: 0,
    isPregnant: false,
    isLactating: false,
    recentContrastExam: "无",
    allergies: "无",
    checklistNotes: "",
  });

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .filter((a) => filterType === "all" || getPatientById(a.patientId)?.patientType === filterType)
      .filter((a) => {
        if (!searchQuery) return true;
        const p = getPatientById(a.patientId);
        return (
          p?.name.includes(searchQuery) ||
          p?.patientNo.includes(searchQuery) ||
          a.sourceNo.includes(searchQuery)
        );
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [appointments, selectedDate, filterType, searchQuery, getPatientById]);

  const stats = useMemo(() => {
    const dayAppts = appointments.filter((a) => a.date === selectedDate);
    return {
      total: dayAppts.length,
      pending: dayAppts.filter((a) => a.status === "pending").length,
      completed: dayAppts.filter((a) => a.status === "completed").length,
      cancelled: dayAppts.filter((a) => a.status === "cancelled" || a.status === "no_show").length,
    };
  }, [appointments, selectedDate]);

  const slotOccupancy = useMemo(() => {
    const map: Record<string, typeof appointments> = {};
    timeSlots.forEach((s) => (map[s] = []));
    filteredAppointments.forEach((a) => {
      if (map[a.timeSlot]) map[a.timeSlot].push(a);
    });
    return map;
  }, [filteredAppointments]);

  const handleNewSubmit = () => {
    const patientId = `p_new_${Date.now()}`;
    const appointmentId = `a_new_${Date.now()}`;

    const hasChecklist =
      newForm.fastingHours > 0 ||
      newForm.bloodGlucose > 0 ||
      newForm.isPregnant ||
      newForm.isLactating ||
      newForm.recentContrastExam !== "无" ||
      newForm.allergies !== "无" ||
      newForm.checklistNotes !== "";

    const checklistData = hasChecklist
      ? {
          fastingHours: newForm.fastingHours,
          bloodGlucose: newForm.bloodGlucose,
          isPregnant: newForm.isPregnant,
          isLactating: newForm.isLactating,
          recentContrastExam: newForm.recentContrastExam,
          allergies: newForm.allergies,
          notes: newForm.checklistNotes,
        }
      : undefined;

    addAppointment(
      {
        id: appointmentId,
        patientId,
        examType: newForm.examType,
        examSubtype: newForm.examSubtype,
        date: selectedDate,
        timeSlot: newForm.timeSlot,
        status: "pending",
        sourceNo: `SRC${selectedDate.replace(/-/g, "")}${String(appointments.length + 1).padStart(3, "0")}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: patientId,
        name: newForm.name,
        gender: newForm.gender,
        age: Number(newForm.age),
        patientNo: newForm.patientNo,
        patientType: newForm.patientType,
        tags: newForm.tags,
        phone: newForm.phone,
        department: newForm.department,
        doctor: newForm.doctor,
      },
      checklistData
    );
    setShowNewModal(false);
    setNewForm({
      name: "",
      gender: "男",
      age: "",
      patientNo: "",
      patientType: "outpatient",
      phone: "",
      department: "",
      doctor: "",
      examType: examTypes[0].type,
      examSubtype: examTypes[0].subtypes[0],
      timeSlot: timeSlots[0],
      tags: [],
      fastingHours: 0,
      bloodGlucose: 0,
      isPregnant: false,
      isLactating: false,
      recentContrastExam: "无",
      allergies: "无",
      checklistNotes: "",
    });
  };

  const handleReschedule = (slot: string) => {
    if (rescheduleTarget) {
      rescheduleAppointment(rescheduleTarget, selectedDate, slot);
      setShowRescheduleModal(false);
      setRescheduleTarget(null);
    }
  };

  const toggleTag = (tag: PatientTag) => {
    setNewForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const currentExamSubtypes = examTypes.find((e) => e.type === newForm.examType)?.subtypes ?? [];

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "今日预约", value: stats.total, color: "text-medical-700", bg: "bg-medical-50" },
          { label: "待签到", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "已完成", value: stats.completed, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "取消/爽约", value: stats.cancelled, color: "text-rose-700", bg: "bg-rose-50" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={cn("inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium", s.bg, s.color)}>
              {s.label}
            </div>
            <div className={cn("mt-2 text-3xl font-bold font-mono", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
              <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center">
                <Calendar className="w-4 h-4 text-medical-600" />
                <span className="text-sm font-medium text-slate-900">{selectedDate}</span>
              </div>
              <button onClick={() => shiftDate(1)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setSelectedDate(currentDate)} className="btn-secondary text-xs py-1.5 px-3">
              <RefreshCw className="w-3.5 h-3.5" />
              今天
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索姓名/病案号/来源号"
                className="input pl-9 w-64"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
              <Filter className="w-4 h-4 text-slate-400 ml-2" />
              {(["all", "outpatient", "inpatient", "emergency"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    filterType === t ? "bg-white text-medical-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t === "all" ? "全部" : patientTypeLabel[t]}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewModal(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" />
              新建预约
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-medical-600" />
            <h3 className="text-sm font-semibold text-slate-900">时段排程</h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {timeSlots.map((slot) => {
            const appts = slotOccupancy[slot] ?? [];
            return (
              <div key={slot} className="flex hover:bg-slate-50/50 transition-colors">
                <div className="w-28 shrink-0 px-4 py-4 border-r border-slate-100 bg-slate-50/30 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-mono font-medium text-slate-700">{slot}</span>
                </div>
                <div className="flex-1 min-h-[72px] p-2 flex flex-wrap gap-2 items-start content-start">
                  {appts.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      空号源，可预约
                    </div>
                  ) : (
                    appts.map((a) => {
                      const p = getPatientById(a.patientId);
                      if (!p) return null;
                      return (
                        <div
                          key={a.id}
                          className={cn(
                            "group flex-1 min-w-[260px] max-w-[320px] rounded-lg border p-3 transition-all",
                            a.status === "cancelled" || a.status === "no_show"
                              ? "bg-slate-50 border-slate-200 opacity-60"
                              : "bg-white border-slate-200 hover:border-medical-300 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn("status-dot shrink-0", appointmentStatusDotClass[a.status])} />
                                <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                                <span className={cn("badge border", patientTypeBadgeClass[p.patientType])}>
                                  {patientTypeLabel[p.patientType]}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-slate-500 font-mono">{p.patientNo}</span>
                                <span className="text-xs text-slate-300">•</span>
                                <span className="text-xs text-slate-500">{p.age}{p.gender}</span>
                                <span className="text-xs text-slate-300">•</span>
                                <span className="text-xs text-slate-500">{a.examSubtype}</span>
                              </div>
                              {p.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {p.tags.map((tag) => (
                                    <span key={tag} className={cn("badge border", patientTagBadgeClass[tag])}>
                                      {patientTagLabel[tag]}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={cn("badge border", appointmentStatusBadgeClass[a.status])}>
                                {appointmentStatusLabel[a.status]}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setRescheduleTarget(a.id);
                                    setShowRescheduleModal(true);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-medical-600 hover:bg-medical-50"
                                  title="改约"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => cancelAppointment(a.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  title="取消"
                                  disabled={a.status === "cancelled"}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-medical-600" />
                <h3 className="text-base font-semibold text-slate-900">新建预约</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-thin space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">患者信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">姓名</label>
                    <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className="input" placeholder="请输入姓名" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">性别</label>
                      <select value={newForm.gender} onChange={(e) => setNewForm({ ...newForm, gender: e.target.value as "男" | "女" })} className="input">
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">年龄</label>
                      <input type="number" value={newForm.age} onChange={(e) => setNewForm({ ...newForm, age: e.target.value })} className="input" placeholder="岁" />
                    </div>
                  </div>
                  <div>
                    <label className="label">病案号</label>
                    <input value={newForm.patientNo} onChange={(e) => setNewForm({ ...newForm, patientNo: e.target.value })} className="input" placeholder="如：P20240601001" />
                  </div>
                  <div>
                    <label className="label">联系电话</label>
                    <input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} className="input" placeholder="手机号码" />
                  </div>
                  <div>
                    <label className="label">患者类型</label>
                    <select value={newForm.patientType} onChange={(e) => setNewForm({ ...newForm, patientType: e.target.value as PatientType })} className="input">
                      <option value="outpatient">门诊</option>
                      <option value="inpatient">住院</option>
                      <option value="emergency">急诊</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">申请科室</label>
                    <input value={newForm.department} onChange={(e) => setNewForm({ ...newForm, department: e.target.value })} className="input" placeholder="如：肿瘤科" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">申请医师</label>
                    <input value={newForm.doctor} onChange={(e) => setNewForm({ ...newForm, doctor: e.target.value })} className="input" placeholder="如：李主任" />
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">重点人群标记</h4>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(patientTagLabel) as PatientTag[]).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        newForm.tags.includes(tag)
                          ? cn(patientTagBadgeClass[tag], "ring-2 ring-offset-1")
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {patientTagLabel[tag]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divider" />

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">检查信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">检查类型</label>
                    <select
                      value={newForm.examType}
                      onChange={(e) => {
                        const subtypes = examTypes.find((x) => x.type === e.target.value)?.subtypes ?? [];
                        setNewForm({ ...newForm, examType: e.target.value, examSubtype: subtypes[0] ?? "" });
                      }}
                      className="input"
                    >
                      {examTypes.map((e) => (
                        <option key={e.type} value={e.type}>{e.type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">检查项目</label>
                    <select value={newForm.examSubtype} onChange={(e) => setNewForm({ ...newForm, examSubtype: e.target.value })} className="input">
                      {currentExamSubtypes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">预约时段（{selectedDate}）</label>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot) => {
                        const occupied = appointments.some((a) => a.date === selectedDate && a.timeSlot === slot && a.status !== "cancelled" && a.status !== "no_show");
                        return (
                          <button
                            key={slot}
                            onClick={() => !occupied && setNewForm({ ...newForm, timeSlot: slot })}
                            disabled={occupied}
                            className={cn(
                              "px-2 py-2 rounded-md text-xs font-mono font-medium border transition-all",
                              newForm.timeSlot === slot
                                ? "bg-medical-600 text-white border-medical-600"
                                : occupied
                                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                : "bg-white text-slate-600 border-slate-200 hover:border-medical-300 hover:text-medical-700"
                            )}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  前置核查信息（选填，到检时可补充）
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label flex items-center justify-between">
                      <span>禁食时长（小时）</span>
                      <span className="text-xs text-slate-400">要求 ≥ 4h</span>
                    </label>
                    <input
                      type="number"
                      value={newForm.fastingHours || ""}
                      onChange={(e) => setNewForm({ ...newForm, fastingHours: Number(e.target.value) })}
                      className="input"
                      placeholder="如：6"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label flex items-center justify-between">
                      <span>血糖值（mmol/L）</span>
                      <span className="text-xs text-slate-400">建议 ≤ 11</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newForm.bloodGlucose || ""}
                      onChange={(e) => setNewForm({ ...newForm, bloodGlucose: Number(e.target.value) })}
                      className="input"
                      placeholder="如：5.6"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                      <div className="text-sm font-medium text-slate-900">是否妊娠</div>
                      <div className="text-xs text-slate-500">PET-CT 辐射对胎儿有影响</div>
                    </div>
                    <button
                      onClick={() => setNewForm({ ...newForm, isPregnant: !newForm.isPregnant })}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        newForm.isPregnant ? "bg-rose-500" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        newForm.isPregnant ? "left-[22px]" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                      <div className="text-sm font-medium text-slate-900">是否哺乳期</div>
                      <div className="text-xs text-slate-500">需停止哺乳 24h 以上</div>
                    </div>
                    <button
                      onClick={() => setNewForm({ ...newForm, isLactating: !newForm.isLactating })}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        newForm.isLactating ? "bg-amber-500" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        newForm.isLactating ? "left-[22px]" : "left-0.5"
                      )} />
                    </button>
                  </div>

                  <div>
                    <label className="label">近期增强检查史</label>
                    <input
                      value={newForm.recentContrastExam}
                      onChange={(e) => setNewForm({ ...newForm, recentContrastExam: e.target.value })}
                      className="input"
                      placeholder="如：1周前CT增强，若无请填'无'"
                    />
                  </div>
                  <div>
                    <label className="label">药物/食物过敏史</label>
                    <input
                      value={newForm.allergies}
                      onChange={(e) => setNewForm({ ...newForm, allergies: e.target.value })}
                      className="input"
                      placeholder="如：青霉素过敏，若无请填'无'"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="label">核查备注</label>
                    <textarea
                      value={newForm.checklistNotes}
                      onChange={(e) => setNewForm({ ...newForm, checklistNotes: e.target.value })}
                      className="input min-h-[60px] resize-none"
                      placeholder="其他需要特别说明的情况..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  系统将自动向患者发送检查准备提醒（禁食时间、血糖控制、携带资料等）。
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowNewModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleNewSubmit} className="btn-primary">
                <Plus className="w-4 h-4" />
                确认预约
              </button>
            </div>
          </div>
        </div>
      )}

      {showRescheduleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-medical-600" />
                <h3 className="text-base font-semibold text-slate-900">改约时段</h3>
              </div>
              <button onClick={() => { setShowRescheduleModal(false); setRescheduleTarget(null); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">请选择新的预约时段（{selectedDate}）：</p>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
                {timeSlots.map((slot) => {
                  const occupied = appointments.some((a) => a.date === selectedDate && a.timeSlot === slot && a.status !== "cancelled" && a.status !== "no_show" && a.id !== rescheduleTarget);
                  return (
                    <button
                      key={slot}
                      onClick={() => handleReschedule(slot)}
                      disabled={occupied}
                      className={cn(
                        "px-2 py-2 rounded-md text-xs font-mono font-medium border transition-all",
                        occupied
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                          : "bg-white text-slate-600 border-slate-200 hover:border-medical-300 hover:text-medical-700 hover:bg-medical-50"
                      )}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {!occupied && <Stethoscope className="w-3 h-3" />}
                        {slot}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
