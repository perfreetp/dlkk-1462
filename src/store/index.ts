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
  FlowNodeType,
  ReportUrgency,
  ChecklistSource,
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

const FLOW_NODE_ORDER: FlowNodeType[] = [
  "check_in",
  "blood_draw",
  "injection",
  "rest",
  "scan",
  "rescan",
  "discharge",
];

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
  canAdvanceToNode: (appointmentId: string, nodeType: FlowNodeType) => boolean;
  getCurrentFlowNode: (appointmentId: string) => FlowNode | undefined;

  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateFlowNodeStatus: (id: string, status: NodeStatus, startTime?: string, endTime?: string) => void;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  addChecklist: (checklist: Omit<Checklist, "id" | "createdAt">) => void;
  updateChecklist: (appointmentId: string, checklist: Partial<Checklist>, source?: ChecklistSource) => void;
  addInjectionRecord: (record: InjectionRecord) => boolean;
  addAppointment: (
    appointment: Appointment,
    patient: Patient,
    checklistData?: Omit<Checklist, "id" | "appointmentId" | "passed" | "source" | "createdAt">
  ) => void;
  cancelAppointment: (id: string) => void;
  rescheduleAppointment: (id: string, date: string, timeSlot: string) => void;
  occupyBed: (bedId: string, appointmentId: string) => void;
  releaseBed: (bedId: string) => void;

  advanceFlow: (appointmentId: string, options?: { skipRescan?: boolean }) => boolean;
  skipFlowNode: (appointmentId: string, nodeType: FlowNodeType) => void;
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

  getCurrentFlowNode: (appointmentId) => {
    const nodes = get()
      .getFlowNodesByAppointment(appointmentId)
      .sort((a, b) => FLOW_NODE_ORDER.indexOf(a.nodeType) - FLOW_NODE_ORDER.indexOf(b.nodeType));
    return nodes.find((n) => n.status === "in_progress");
  },

  canAdvanceToNode: (appointmentId, nodeType) => {
    const nodes = get()
      .getFlowNodesByAppointment(appointmentId)
      .sort((a, b) => FLOW_NODE_ORDER.indexOf(a.nodeType) - FLOW_NODE_ORDER.indexOf(b.nodeType));
    const targetIdx = FLOW_NODE_ORDER.indexOf(nodeType);
    const currentIdx = nodes.findIndex((n) => n.status === "in_progress");
    const firstPendingIdx = nodes.findIndex((n) => n.status === "pending");
    if (currentIdx === -1) {
      return firstPendingIdx === targetIdx;
    }
    let nextIdx = currentIdx + 1;
    while (nextIdx < nodes.length && nodes[nextIdx].status === "skipped") {
      nextIdx++;
    }
    return nextIdx === targetIdx;
  },

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
    set((state) => {
      const now = new Date().toISOString();
      const newChecklist: Checklist = {
        ...checklist,
        id: `cl_${Date.now()}`,
        createdAt: now,
      };
      return { checklists: [...state.checklists, newChecklist] };
    }),

  updateChecklist: (appointmentId, checklistUpdate, source) =>
    set((state) => {
      const existing = state.checklists.find((c) => c.appointmentId === appointmentId);
      if (existing) {
        const now = new Date().toISOString();
        return {
          checklists: state.checklists.map((c) =>
            c.appointmentId === appointmentId
              ? {
                  ...c,
                  ...checklistUpdate,
                  source: source ?? c.source,
                  updatedAt: now,
                }
              : c
          ),
        };
      }
      return state;
    }),

  addInjectionRecord: (record) => {
    const canInject = get().canAdvanceToNode(record.appointmentId, "injection");
    if (!canInject) {
      console.warn("流程异常：未到注射环节，无法登记注射");
      return false;
    }
    set((state) => {
      const nodes = state.flowNodes.filter((n) => n.appointmentId === record.appointmentId);
      const injectionNode = nodes.find((n) => n.nodeType === "injection");
      const restNode = nodes.find((n) => n.nodeType === "rest");
      const now = record.injectTime;

      let updatedFlowNodes = state.flowNodes;
      if (injectionNode) {
        updatedFlowNodes = updatedFlowNodes.map((n) =>
          n.id === injectionNode.id
            ? { ...n, status: "completed" as NodeStatus, startTime: now, endTime: now, operator: record.injector }
            : n
        );
      }
      if (restNode) {
        updatedFlowNodes = updatedFlowNodes.map((n) =>
          n.id === restNode.id ? { ...n, status: "in_progress" as NodeStatus, startTime: now } : n
        );
      }

      let updatedAppointments = state.appointments;
      const appt = state.appointments.find((a) => a.id === record.appointmentId);
      if (appt && appt.status !== "in_progress") {
        updatedAppointments = updatedAppointments.map((a) =>
          a.id === record.appointmentId ? { ...a, status: "in_progress" as AppointmentStatus } : a
        );
      }

      return {
        injectionRecords: [...state.injectionRecords, record],
        flowNodes: updatedFlowNodes,
        appointments: updatedAppointments,
      };
    });
    return true;
  },

  addAppointment: (appointment, patient, checklistData) =>
    set((state) => {
      const newFlowNodes: FlowNode[] = FLOW_NODE_ORDER.map((nodeType, index) => ({
        id: `fn_${appointment.id}_${index}`,
        appointmentId: appointment.id,
        nodeType,
        status: "pending" as NodeStatus,
      }));

      const newReport: Report = {
        id: `r_${appointment.id}`,
        appointmentId: appointment.id,
        radiologist: "待分配",
        status: "pending" as ReportStatus,
        urgency: "normal" as ReportUrgency,
      };

      let newChecklists = state.checklists;
      if (checklistData) {
        const now = new Date().toISOString();
        const passed =
          !checklistData.isPregnant &&
          checklistData.bloodGlucose <= 11 &&
          checklistData.fastingHours >= 4;
        newChecklists = [
          ...state.checklists,
          {
            id: `cl_${appointment.id}`,
            appointmentId: appointment.id,
            ...checklistData,
            passed,
            source: "appointment" as ChecklistSource,
            createdAt: now,
          },
        ];
      }

      return {
        appointments: [...state.appointments, appointment],
        patients: [...state.patients, patient],
        flowNodes: [...state.flowNodes, ...newFlowNodes],
        reports: [...state.reports, newReport],
        checklists: newChecklists,
      };
    }),

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

  advanceFlow: (appointmentId, options = {}) => {
    const { skipRescan = true } = options;
    const currentNode = get().getCurrentFlowNode(appointmentId);
    const nodes = get()
      .getFlowNodesByAppointment(appointmentId)
      .sort((a, b) => FLOW_NODE_ORDER.indexOf(a.nodeType) - FLOW_NODE_ORDER.indexOf(b.nodeType));

    if (nodes.length === 0) return false;

    const currentIdx = nodes.findIndex((n) => n.status === "in_progress");
    const pendingIdx = nodes.findIndex((n) => n.status === "pending");

    if (currentIdx === -1 && pendingIdx === -1) {
      console.warn("流程异常：无可推进的节点");
      return false;
    }

    let targetCurrentIdx = currentIdx;
    let targetNextIdx = pendingIdx;

    if (currentIdx === -1 && pendingIdx !== -1) {
      targetNextIdx = pendingIdx;
    } else if (currentIdx !== -1) {
      targetCurrentIdx = currentIdx;
      targetNextIdx = currentIdx + 1;
    }

    if (skipRescan && targetNextIdx < nodes.length && nodes[targetNextIdx].nodeType === "rescan") {
      nodes[targetNextIdx].status = "skipped";
      targetNextIdx++;
    }

    while (
      targetNextIdx < nodes.length &&
      nodes[targetNextIdx].status === "skipped"
    ) {
      targetNextIdx++;
    }

    set((state) => {
      const now = new Date().toISOString();
      let updatedNodes = [...state.flowNodes];

      if (targetCurrentIdx !== -1 && nodes[targetCurrentIdx]) {
        const nodeId = nodes[targetCurrentIdx].id;
        updatedNodes = updatedNodes.map((n) =>
          n.id === nodeId ? { ...n, status: "completed" as NodeStatus, endTime: now } : n
        );
      }

      if (targetNextIdx < nodes.length && nodes[targetNextIdx]) {
        const nextNodeId = nodes[targetNextIdx].id;
        updatedNodes = updatedNodes.map((n) =>
          n.id === nextNodeId ? { ...n, status: "in_progress" as NodeStatus, startTime: now } : n
        );
      }

      const allCompleted = updatedNodes
        .filter((n) => n.appointmentId === appointmentId)
        .every((n) => n.status === "completed" || n.status === "skipped");

      let updatedAppointments = state.appointments;
      let updatedReports = state.reports;

      if (allCompleted) {
        updatedAppointments = updatedAppointments.map((a) =>
          a.id === appointmentId ? { ...a, status: "completed" as AppointmentStatus } : a
        );
      } else if (pendingIdx === 0 || currentIdx !== -1) {
        updatedAppointments = updatedAppointments.map((a) =>
          a.id === appointmentId ? { ...a, status: "in_progress" as AppointmentStatus } : a
        );
      }

      if (allCompleted) {
        updatedReports = updatedReports.map((r) =>
          r.appointmentId === appointmentId && r.status === "pending"
            ? { ...r, status: "reporting" as ReportStatus }
            : r
        );
      }

      return {
        flowNodes: updatedNodes,
        appointments: updatedAppointments,
        reports: updatedReports,
      };
    });
    return true;
  },

  skipFlowNode: (appointmentId, nodeType) => {
    set((state) => {
      const node = state.flowNodes.find(
        (n) => n.appointmentId === appointmentId && n.nodeType === nodeType
      );
      if (!node) return state;
      return {
        flowNodes: state.flowNodes.map((n) =>
          n.id === node.id ? { ...n, status: "skipped" as NodeStatus } : n
        ),
      };
    });
  },
}));
