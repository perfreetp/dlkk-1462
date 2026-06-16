import type {
  AppointmentStatus,
  FlowNodeType,
  NodeStatus,
  PatientTag,
  PatientType,
  ReportStatus,
  ReportUrgency,
  DeviceStatus,
  ChecklistSource,
} from "@/types";

export const cn = (...classes: (string | false | undefined)[]): string =>
  classes.filter(Boolean).join(" ");

export const formatDateTime = (iso: string | undefined, format: "full" | "time" | "date" = "full"): string => {
  if (!iso) return "--";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (format === "date") return dateStr;
  if (format === "time") return timeStr;
  return `${dateStr} ${timeStr}`;
};

export const getMinutesElapsed = (startIso: string | undefined): number => {
  if (!startIso) return 0;
  return Math.floor((Date.now() - new Date(startIso).getTime()) / 60000);
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
};

export const patientTypeLabel: Record<PatientType, string> = {
  outpatient: "门诊",
  inpatient: "住院",
  emergency: "急诊",
};

export const patientTypeBadgeClass: Record<PatientType, string> = {
  outpatient: "bg-medical-50 text-medical-700 border border-medical-100",
  inpatient: "bg-violet-50 text-violet-700 border border-violet-100",
  emergency: "bg-rose-50 text-rose-700 border border-rose-100",
};

export const patientTagLabel: Record<PatientTag, string> = {
  diabetes: "糖尿病",
  child: "儿童",
  disabled: "行动不便",
  pregnant: "妊娠",
  allergy: "过敏史",
  elderly: "高龄",
  claustrophobia: "幽闭恐惧",
};

export const patientTagBadgeClass: Record<PatientTag, string> = {
  diabetes: "bg-amber-50 text-amber-700 border border-amber-100",
  child: "bg-sky-50 text-sky-700 border border-sky-100",
  disabled: "bg-orange-50 text-orange-700 border border-orange-100",
  pregnant: "bg-pink-50 text-pink-700 border border-pink-100",
  allergy: "bg-red-50 text-red-700 border border-red-100",
  elderly: "bg-purple-50 text-purple-700 border border-purple-100",
  claustrophobia: "bg-yellow-50 text-yellow-700 border border-yellow-100",
};

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  pending: "待签到",
  checked_in: "已签到",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "爽约",
};

export const appointmentStatusDotClass: Record<AppointmentStatus, string> = {
  pending: "bg-slate-400",
  checked_in: "bg-sky-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-300",
  no_show: "bg-rose-500",
};

export const appointmentStatusBadgeClass: Record<AppointmentStatus, string> = {
  pending: "bg-slate-50 text-slate-600 border border-slate-200",
  checked_in: "bg-sky-50 text-sky-700 border border-sky-200",
  in_progress: "bg-amber-50 text-amber-700 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-slate-50 text-slate-500 border border-slate-200",
  no_show: "bg-rose-50 text-rose-700 border border-rose-200",
};

export const flowNodeLabel: Record<FlowNodeType, string> = {
  check_in: "签到",
  blood_draw: "采血",
  injection: "注射",
  rest: "静卧",
  scan: "入机",
  rescan: "补扫",
  discharge: "离院",
};

export const flowNodeStatusClass: Record<NodeStatus, string> = {
  pending: "bg-slate-100 text-slate-400 border-slate-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-300 animate-pulse",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  skipped: "bg-slate-50 text-slate-400 border-slate-200",
};

export const reportStatusLabel: Record<ReportStatus, string> = {
  pending: "待报告",
  reporting: "报告中",
  reviewed: "已审核",
  published: "已发布",
};

export const reportStatusBadgeClass: Record<ReportStatus, string> = {
  pending: "bg-slate-50 text-slate-600 border border-slate-200",
  reporting: "bg-amber-50 text-amber-700 border border-amber-200",
  reviewed: "bg-sky-50 text-sky-700 border border-sky-200",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export const reportUrgencyLabel: Record<ReportUrgency, string> = {
  normal: "普通",
  urgent: "加急",
};

export const deviceStatusLabel: Record<DeviceStatus, string> = {
  running: "运行中",
  maintenance: "维护中",
  fault: "故障",
};

export const deviceStatusDotClass: Record<DeviceStatus, string> = {
  running: "bg-emerald-500",
  maintenance: "bg-amber-500",
  fault: "bg-rose-500",
};

export const timeSlots = [
  "08:00-08:30",
  "08:30-09:00",
  "09:00-09:30",
  "09:30-10:00",
  "10:00-10:30",
  "10:30-11:00",
  "11:00-11:30",
  "11:30-12:00",
  "14:00-14:30",
  "14:30-15:00",
  "15:00-15:30",
  "15:30-16:00",
  "16:00-16:30",
  "16:30-17:00",
];

export const examTypes = [
  { type: "PET-CT", subtypes: ["全身肿瘤筛查", "胸部专项", "脑部专项", "心肌灌注", "腹部专项"] },
  { type: "骨扫描", subtypes: ["全身骨显像", "局部骨显像", "三相骨显像"] },
  { type: "SPECT", subtypes: ["甲状腺显像", "肾动态显像", "心肌灌注显像", "肺灌注显像"] },
];

export const checklistSourceLabel: Record<ChecklistSource, string> = {
  appointment: "预约时录入",
  assessment: "到检时评估",
};

export const checklistSourceBadgeClass: Record<ChecklistSource, string> = {
  appointment: "bg-sky-50 text-sky-700 border border-sky-100",
  assessment: "bg-emerald-50 text-emerald-700 border border-emerald-100",
};
