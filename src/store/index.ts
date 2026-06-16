import { create } from "zustand";
import type {
  Patient,
  Appointment,
  FlowNode,
  Checklist,
  InjectionRecord,
  Device,
  Report,
  RestBed,
  StatisticsData,
  AppointmentStatus,
  NodeStatus,
  ReportStatus,
} from "@/types";
import { patients as mockPatients } from "@/mock/patients";
import { appointments as mockAppointments } from "@/mock/appointments";
import {
  flowNodes as mockFlowNodes,
  checklists as mockChecklists,
  injectionRecords as mockInjectionRecords,
  devices as mockDevices,
  reports as mockReports,
  restBeds as mockRestBeds,
  statisticsData as mockStatisticsData,
} from "@/mock";

interface AppState {
  patients: Patient[];
  appointments: Appointment[];
  flowNodes: FlowNode[];
  checklists: Checklist[];
  injectionRecords: InjectionRecord[];
  devices: Device[];
  reports: Report[];
  restBeds: RestBed[];
  statistics: StatisticsData;
  currentDate: string;

  getPatientById: (id: string) => Patient | undefined;
  getAppointmentsByDate: (date: string) => Appointment[];
  getAppointmentById: (id: string) => Appointment | undefined;
  getFlowNodesByAppointment: (appointmentId: string) => FlowNode[];
  getChecklistByAppointment: (appointmentId: string) => Checklist | undefined;
  getInjectionByAppointment: (appointmentId: string) => InjectionRecord | undefined;
  getReportByAppointment: (appointmentId: string) => Report | undefined;

  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateFlowNodeStatus: (id: string, status: NodeStatus, startTime?: string, endTime?: string) => void;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  addChecklist: (checklist: Checklist) => void;
  addInjectionRecord: (record: InjectionRecord) => void;
  addAppointment: (appointment: Appointment, patient: Patient) => void;
  cancelAppointment: (id: string) => void;
  rescheduleAppointment: (id: string, date: string, timeSlot: string) => void;
  occupyBed: (bedId: string, appointmentId: string) => void;
  releaseBed: (bedId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  patients: mockPatients,
  appointments: mockAppointments,
  flowNodes: mockFlowNodes,
  checklists: mockChecklists,
  injectionRecords: mockInjectionRecords,
  devices: mockDevices,
  reports: mockReports,
  restBeds: mockRestBeds,
  statistics: mockStatisticsData,
  currentDate: "2026-06-16",

  getPatientById: (id) => get().patients.find((p) => p.id === id),
  getAppointmentsByDate: (date) => get().appointments.filter((a) => a.date === date),
  getAppointmentById: (id) => get().appointments.find((a) => a.id === id),
  getFlowNodesByAppointment: (appointmentId) =>
    get().flowNodes.filter((n) => n.appointmentId === appointmentId),
  getChecklistByAppointment: (appointmentId) =>
    get().checklists.find((c) => c.appointmentId === appointmentId),
  getInjectionByAppointment: (appointmentId) =>
    get().injectionRecords.find((i) => i.appointmentId === appointmentId),
  getReportByAppointment: (appointmentId) =>
    get().reports.find((r) => r.appointmentId === appointmentId),

  updateAppointmentStatus: (id, status) =>
    set((state) => ({
      appointments: state.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  updateFlowNodeStatus: (id, status, startTime, endTime) =>
    set((state) => ({
      flowNodes: state.flowNodes.map((n) =>
        n.id === id ? { ...n, status, startTime: startTime ?? n.startTime, endTime: endTime ?? n.endTime } : n
      ),
    })),

  updateReportStatus: (id, status) =>
    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    })),

  addChecklist: (checklist) =>
    set((state) => ({ checklists: [...state.checklists, checklist] })),

  addInjectionRecord: (record) =>
    set((state) => ({ injectionRecords: [...state.injectionRecords, record] })),

  addAppointment: (appointment, patient) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
      patients: [...state.patients, patient],
    })),

  cancelAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, status: "cancelled" as AppointmentStatus } : a
      ),
    })),

  rescheduleAppointment: (id, date, timeSlot) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, date, timeSlot, status: "pending" as AppointmentStatus } : a
      ),
    })),

  occupyBed: (bedId, appointmentId) =>
    set((state) => ({
      restBeds: state.restBeds.map((b) =>
        b.id === bedId
          ? { ...b, occupied: true, appointmentId, occupiedSince: new Date().toISOString() }
          : b
      ),
    })),

  releaseBed: (bedId) =>
    set((state) => ({
      restBeds: state.restBeds.map((b) =>
        b.id === bedId ? { ...b, occupied: false, appointmentId: undefined, occupiedSince: undefined } : b
      ),
    })),
}));
