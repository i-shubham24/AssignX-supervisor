/**
 * Portal api: one function per backend endpoint.
 *
 * Signatures here are the contract. Inputs and outputs use the shapes in
 * src/types/domain.ts. The `actor` argument exists only for the demo store; the real
 * endpoints derive the actor from the session and must never trust a client value.
 */
import * as db from "@/demo/db";
import type { OfferInput, QuoteInput } from "@/demo/db";
import type {
  Channel,
  QcRecord,
  RefundRequest,
  Segment,
  Ticket,
  TrainingModule,
  VerificationCase,
} from "@/types/domain";
import { call, GET, PATCH, POST } from "./client";

/* Reads ------------------------------------------------------------- */

export const fetchOperators = () => call(GET("/api/portal/people?kind=operators"), db.read.operators);
// The backend scopes by the session; the demo passes the actor explicitly.
export const fetchProjects = (actor: string) => call(GET("/api/portal/queues/:queue"), () => db.read.projects(actor), 220);
export const fetchProject = (id: string, actor: string) => call(GET(`/api/portal/projects/${id}`), () => db.read.project(id, actor));
export const fetchMessages = (projectId: string, channel: Channel) =>
  call(GET(`/api/portal/projects/${projectId}/messages?channel=${channel}`), () => db.read.messages(projectId, channel), 140);
export const fetchHeld = () => call(GET("/api/portal/queues/moderation"), db.read.held);
export const fetchDoers = () => call(GET("/api/portal/doers"), db.read.doers);
export const fetchDoer = (id: string) => call(GET(`/api/portal/doers/${id}`), () => db.read.doer(id));
export const fetchDoerProjects = (id: string, actor: string) => call(GET(`/api/portal/doers/${id}/projects`), () => db.read.doerProjects(id, actor));
export const fetchTickets = () => call(GET("/api/portal/tickets"), db.read.tickets);
export const fetchTicket = (id: string) => call(GET(`/api/portal/tickets/${id}`), () => db.read.ticket(id));
export const fetchVerification = () => call(GET("/api/portal/doers?view=verification"), db.read.verification);
export const fetchRefunds = () => call(GET("/api/portal/refunds"), db.read.refunds);
export const fetchTraining = () => call(GET("/api/portal/training"), db.read.training);
export const fetchTrainingModule = (id: string) => call(GET(`/api/portal/training/${id}`), () => db.read.trainingModule(id));
export const fetchApplications = () => call(GET("/api/portal/supervisor-applications"), db.read.applications);
export const fetchWorkspaceLogins = () => call(GET("/api/portal/workspace-logins"), db.read.workspaceLogins);
export const fetchRateBands = () => call(GET("/api/portal/rate-reference"), db.read.rateBands);
export const fetchLedger = () => call(GET("/api/portal/ledger"), db.read.ledger);
export const fetchActivity = () => call(GET("/api/portal/activity"), db.read.activity, 120);
export const fetchNotifications = (segment: Segment) => call(GET("/api/portal/notifications"), () => db.read.notifications(segment), 120);
export const fetchDisbursements = () => call(GET("/api/portal/queues/disbursement"), db.read.disbursements);

/* QQD --------------------------------------------------------------- */

export const sendQuote = (projectId: string, input: QuoteInput, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/quote`), () => db.sendQuote(projectId, input, actor), 420);
export const assignSupervisor = (projectId: string, supervisorId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/assign-supervisor`), () => db.assignSupervisor(projectId, supervisorId, actor));
export const executePayout = (projectDoerId: string, actor: string) =>
  call(POST(`/api/portal/payouts/${projectDoerId}/execute`), () => db.executePayout(projectDoerId, actor), 600);
export const executeRefund = (refundId: string, actor: string) =>
  call(POST(`/api/portal/refunds/${refundId}/execute`), () => db.executeRefund(refundId, actor), 600);
export const recordDocumentCheck = (caseId: string, patch: Pick<VerificationCase, "documents" | "payout_name_matches">, actor: string) =>
  call(PATCH(`/api/portal/doers/verification/${caseId}`), () => db.recordDocumentCheck(caseId, patch, actor));
export const assignOnboarding = (caseId: string, supervisorId: string, actor: string) =>
  call(POST(`/api/portal/doers/verification/${caseId}/assign`), () => db.assignOnboarding(caseId, supervisorId, actor));
export const decideVerification = (caseId: string, approve: boolean, reason: string, actor: string) =>
  call(POST(`/api/portal/doers/verification/${caseId}/decide`), () => db.decideVerification(caseId, approve, reason, actor));
export const createModule = (input: Pick<TrainingModule, "title" | "description" | "audience" | "categories" | "has_assessment">, actor: string) =>
  call(POST("/api/portal/training"), () => db.createModule(input, actor));
export const updateModule = (id: string, patch: Parameters<typeof db.updateModule>[1], actor: string) =>
  call(PATCH(`/api/portal/training/${id}/content`), () => db.updateModule(id, patch, actor), 400);
export const reopenQuote = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/reopen-quote`), () => db.reopenQuote(projectId, actor));
export const decideSupervisorApplication = (id: string, approve: boolean, reason: string, actor: string) =>
  call(POST(`/api/portal/supervisor-applications/${id}/decide`), () => db.decideSupervisorApplication(id, approve, reason, actor));
export const updateApplicationChecks = (id: string, patch: { id_checked: boolean; interview_done: boolean }, actor: string) =>
  call(PATCH(`/api/portal/supervisor-applications/${id}`), () => db.updateApplicationChecks(id, patch, actor), 120);
export const addWorkspaceLogins = (count: number, actor: string) =>
  call(POST("/api/portal/workspace-logins"), () => db.addWorkspaceLogins(count, actor));
export const setModuleState = (id: string, next: TrainingModule["state"], actor: string) =>
  call(PATCH(`/api/portal/training/${id}`), () => db.setModuleState(id, next, actor));

/* Supervisor -------------------------------------------------------- */

export const sendOffer = (projectId: string, input: OfferInput, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/offer-doer`), () => db.sendOffer(projectId, input, actor), 380);
export const withdrawOffer = (projectDoerId: string, actor: string) =>
  call(POST(`/api/portal/offers/${projectDoerId}/withdraw`), () => db.withdrawOffer(projectDoerId, actor));
export const openToPool = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/open-pool`), () => db.openToPool(projectId, actor));
export const selfAssign = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/self-assign`), () => db.selfAssign(projectId, actor));
export const setWorkingLink = (projectDoerId: string, url: string, actor: string) =>
  call(POST(`/api/portal/assignments/${projectDoerId}/working-link`), () => db.setWorkingLink(projectDoerId, url, actor));
export const updateProgress = (projectId: string, percent: number, label: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/progress`), () => db.updateProgress(projectId, percent, label, actor));
export const postSnapshot = (projectId: string, filename: string, note: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/snapshot`), () => db.postSnapshot(projectId, filename, note, actor), 500);
export const sendMessage = (projectId: string, channel: Channel, body: string, actor: string, attachments: string[] = []) =>
  call(POST(`/api/portal/projects/${projectId}/messages`), () => db.sendMessage(projectId, channel, body, actor, attachments), 160);
export const moderateMessage = (messageId: string, decision: "approve" | "remove", actor: string) =>
  call(POST(`/api/portal/messages/${messageId}/moderate`), () => db.moderate(messageId, decision, actor));
export const moderateMessagesBulk = (messageIds: string[], decision: "approve" | "remove", actor: string) =>
  call(POST(`/api/portal/messages/moderate-bulk`), () => db.moderateBulk(messageIds, decision, actor));
export const saveQc = (projectId: string, qc: Omit<QcRecord, "completed_at">, actor: string) =>
  call(PATCH(`/api/portal/projects/${projectId}/qc`), () => db.saveQc(projectId, qc, actor), 120);
export const addDeliverable = (projectId: string, filename: string, kind: "deliverable" | "quality_report", actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/attachments`), () => db.addDeliverable(projectId, filename, kind, actor), 700);
export const removeAttachment = (projectId: string, attachmentId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/attachments/${attachmentId}/remove`), () => db.removeAttachment(projectId, attachmentId, actor));
export const deliver = (projectId: string, note: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/deliver`), () => db.deliver(projectId, note, actor), 500);
export const sendBack = (projectId: string, reason: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/send-back`), () => db.sendBack(projectId, reason, actor));
export const respondToFlag = (projectId: string, flagId: string, message: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/flags/${flagId}/respond`), () => db.respondToFlag(projectId, flagId, message, actor));
export const replaceDoer = (projectDoerId: string, reason: string, actor: string) =>
  call(POST(`/api/portal/assignments/${projectDoerId}/replace`), () => db.replaceDoer(projectDoerId, reason, actor));
export const fetchProjectHistory = (projectId: string, actor: string) =>
  call(GET(`/api/portal/projects/${projectId}/history`), () => db.projectHistory(projectId, actor), 120);
export const submitOwnWork = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/submit-own-work`), () => db.submitOwnWork(projectId, actor));
export const releasePayout = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/release-payout`), () => db.releasePayout(projectId, actor));

/* Support ----------------------------------------------------------- */

export const replyTicket = (ticketId: string, body: string, actor: string, internal: boolean) =>
  call(POST(`/api/portal/tickets/${ticketId}/entries`), () => db.replyTicket(ticketId, body, actor, internal));
export const updateTicket = (ticketId: string, patch: Partial<Pick<Ticket, "status" | "priority" | "owner_id" | "category">>, actor: string) =>
  call(PATCH(`/api/portal/tickets/${ticketId}`), () => db.updateTicket(ticketId, patch, actor));
export const resolveTicket = (ticketId: string, resolution: string, actor: string) =>
  call(POST(`/api/portal/tickets/${ticketId}/resolve`), () => db.resolveTicket(ticketId, resolution, actor));
export const recommendRefund = (ticketId: string, rec: NonNullable<Ticket["refund_recommendation"]>, actor: string) =>
  call(POST(`/api/portal/tickets/${ticketId}/recommend-refund`), () => db.recommendRefund(ticketId, rec, actor));
/** PRD 11.3: the project's supervisor decides doer fault before QQD executes. */
export const decideLiability = (refundId: string, decision: NonNullable<RefundRequest["liability_decision"]>, reason: string, partialInr: number | null, actor: string) =>
  call(POST(`/api/portal/refunds/${refundId}/liability`), () => db.decideLiability(refundId, decision, reason, partialInr, actor));

/* Operator ---------------------------------------------------------- */

export const escalateToSupport = (projectId: string, input: Parameters<typeof db.escalateToSupport>[1], actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/escalate`), () => db.escalateToSupport(projectId, input, actor));
export const reassignSupervisor = (projectId: string, supervisorId: string, reason: string, actor: string) =>
  call(POST(`/api/portal/projects/${projectId}/reassign-supervisor`), () => db.reassignSupervisor(projectId, supervisorId, reason, actor));
export const fetchPreferences = (actor: string) => call(GET("/api/portal/me/preferences"), () => db.readPreferences(actor), 120);
export const savePreferences = (actor: string, prefs: Parameters<typeof db.savePreferences>[1]) =>
  call(PATCH("/api/portal/me/preferences"), () => db.savePreferences(actor, prefs));
export const setOnDuty = (operatorId: string, onDuty: boolean) => call(POST("/api/portal/me/duty"), () => db.setOnDuty(operatorId, onDuty), 100);
export const markNotificationRead = (segment: Segment, id: string | "all") =>
  call(POST("/api/portal/notifications/read"), () => db.markNotificationRead(segment, id), 80);

/* Demo-only simulations of the other surfaces ----------------------- */

export const demo = {
  clientPays: (projectId: string) => call(POST("demo"), () => db.simulatePayment(projectId), 500),
  doerResponds: (projectDoerId: string, accept: boolean) => call(POST("demo"), () => db.simulateOfferResponse(projectDoerId, accept), 400),
  doerSubmits: (projectId: string) => call(POST("demo"), () => db.simulateDoerSubmit(projectId), 400),
  clientRevises: (projectId: string, reason: string) => call(POST("demo"), () => db.simulateClientRevision(projectId, reason), 400),
  clientApproves: (projectId: string) => call(POST("demo"), () => db.simulateClientApprove(projectId), 400),
  clientFlags: (projectId: string, reason: "delay" | "quality" | "communication" | "scope_mismatch" | "other", detail: string) =>
    call(POST("demo"), () => db.simulateClientFlag(projectId, reason, detail), 400),
};
