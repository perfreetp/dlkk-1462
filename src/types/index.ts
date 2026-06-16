export type PatientType = "outpatient" | "inpatient" | "emergency";

export type PatientTag =
  | "diabetes"
  | "child"
  | "disabled"
  | "pregnant"
  | "allergy"
  | "elderly"
  | "claustrophobia";

export type AppointmentStatus =
  | "pending"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type FlowNodeType =
  | "check_in"
  | "blood_draw"
  | "injection"
  | "rest"
  | "scan"
  | "rescan"
  | "discharge";

export type NodeStatus = "pending" | "in_progress" | "completed" | "skipped";

export type DeviceStatus = "running" | "maintenance" | "fault";

export type ReportStatus = "pending" | "reporting" | "reviewed" | "published";

export type ReportUrgency = "normal" | "urgent";

export interface Patient {
  id: string;
  name: string;
  gender: "男" | "女";
  age: number;
  patientNo: string;
  patientType: PatientType;
  tags: PatientTag[];
  phone: string;
  department: string;
  doctor: string;
  bedNo?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  examType: string;
  examSubtype: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  sourceNo: string;
  tracerBatch?: string;
  createdAt: string;
  reminderSent?: boolean;
}

export interface Checklist {
  id: string;
  appointmentId: string;
  fastingHours: number;
  bloodGlucose: number;
  isPregnant: boolean;
  isLactating: boolean;
  recentContrastExam: string;
  allergies: string;
  notes: string;
  passed: boolean;
}

export interface FlowNode {
  id: string;
  appointmentId: string;
  nodeType: FlowNodeType;
  startTime?: string;
  endTime?: string;
  operator?: string;
  status: NodeStatus;
  remark?: string;
}

export interface InjectionRecord {
  id: string;
  appointmentId: string;
  tracerType: string;
  tracerBatch: string;
  tracerActivity: number;
  injectTime: string;
  injector: string;
  injectionSite: string;
  adverseReaction?: string;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  status: DeviceStatus;
  currentAppointmentId?: string;
  utilizationToday: number;
  currentProgress?: number;
}

export interface Report {
  id: string;
  appointmentId: string;
  radiologist: string;
  status: ReportStatus;
  reportTime?: string;
  pickupTime?: string;
  urgency: ReportUrgency;
}

export interface RestBed {
  id: string;
  name: string;
  zone: string;
  occupied: boolean;
  appointmentId?: string;
  occupiedSince?: string;
}

export interface StatisticsData {
  noShowRate: number;
  avgWaitingMinutes: number;
  deviceUtilization: number;
  dailyExams: number;
  weeklyExams: number;
  hourlyDistribution: { hour: number; count: number }[];
  examTypeDistribution: { type: string; count: number }[];
  monthlyTrend: { date: string; count: number }[];
}
