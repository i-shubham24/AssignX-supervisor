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
  DoerConductEntry,
  DoerLevel,
  QcRecord,
  RefundRequest,
  Segment,
  Ticket,
  TrainingModule,
  VerificationCase,
} from "@/types/domain";
import { call, GET, newIdempotencyKey, PATCH, POST } from "./client";

/* Reads ------------------------------------------------------------- */

export const fetchOperators = () => call(GET("/api/portal/people?kind=operators"), db.read.operators);
// The backend scopes by the session; the demo passes the actor explicitly.
export const fetchProjects = (actor: string, queue = "all") =>
  call(GET(`/api/portal/queues/${encodeURIComponent(queue)}`), () => db.read.projects(actor), 220);
export const fetchProject = (id: string, actor: string) =>
  call(GET(`/api/portal/projects/${encodeURIComponent(id)}`), () => db.read.project(id, actor));
export const fetchMessages = (projectId: string, channel: Channel) =>
  call(GET(`/api/portal/projects/${encodeURIComponent(projectId)}/messages?channel=${encodeURIComponent(channel)}`), () => db.read.messages(projectId, channel), 140);
export const fetchHeld = () => call(GET("/api/portal/queues/moderation"), db.read.held);
export const fetchDoers = () => call(GET("/api/portal/doers"), db.read.doers);
export const fetchDoer = (id: string) => call(GET(`/api/portal/doers/${encodeURIComponent(id)}`), () => db.read.doer(id));
export const fetchDoerProjects = (id: string, actor: string) =>
  call(GET(`/api/portal/doers/${encodeURIComponent(id)}/projects`), () => db.read.doerProjects(id, actor));
export const fetchTickets = () => call(GET("/api/portal/tickets"), db.read.tickets);
export const fetchTicket = (id: string) => call(GET(`/api/portal/tickets/${encodeURIComponent(id)}`), () => db.read.ticket(id));
export const fetchVerification = () => call(GET("/api/portal/doers?view=verification"), db.read.verification);
export const fetchRefunds = () => call(GET("/api/portal/refunds"), db.read.refunds);
export const fetchTraining = () => call(GET("/api/portal/training"), db.read.training);
export const fetchTrainingModule = (id: string) =>
  call(GET(`/api/portal/training/${encodeURIComponent(id)}`), () => db.read.trainingModule(id));
export const fetchApplications = () => call(GET("/api/portal/supervisor-applications"), db.read.applications);
export const fetchWorkspaceLogins = () => call(GET("/api/portal/workspace-logins"), db.read.workspaceLogins);
export const fetchRateBands = () => call(GET("/api/portal/rate-reference"), db.read.rateBands);
export const fetchLedger = () => call(GET("/api/portal/ledger"), db.read.ledger);
export const fetchActivity = () => call(GET("/api/portal/activity"), db.read.activity, 120);
export const fetchNotifications = (segment: Segment) =>
  call(GET("/api/portal/notifications"), () => db.read.notifications(segment), 120);
export const fetchDisbursements = () => call(GET("/api/portal/queues/disbursement"), db.read.disbursements);

/* QQD --------------------------------------------------------------- */

export const sendQuote = (projectId: string, input: QuoteInput, actor: string, idempotencyKey?: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/quote`), () => db.sendQuote(projectId, input, actor), {
    latency: 420,
    body: input,
    idempotencyKey: idempotencyKey ?? newIdempotencyKey("quote"),
  });
export const assignSupervisor = (projectId: string, supervisorId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/assign-supervisor`), () => db.assignSupervisor(projectId, supervisorId, actor), {
    body: { supervisor_id: supervisorId },
  });
export const executePayout = (projectDoerId: string, actor: string, idempotencyKey?: string) =>
  call(POST(`/api/portal/payouts/${encodeURIComponent(projectDoerId)}/execute`), () => db.executePayout(projectDoerId, actor), {
    latency: 600,
    body: { project_doer_id: projectDoerId },
    idempotencyKey: idempotencyKey ?? newIdempotencyKey("payout"),
  });
export const executeRefund = (refundId: string, actor: string, idempotencyKey?: string) =>
  call(POST(`/api/portal/refunds/${encodeURIComponent(refundId)}/execute`), () => db.executeRefund(refundId, actor), {
    latency: 600,
    body: { refund_id: refundId },
    idempotencyKey: idempotencyKey ?? newIdempotencyKey("refund"),
  });
export const recordDocumentCheck = (caseId: string, patch: Pick<VerificationCase, "documents" | "payout_name_matches">, actor: string) =>
  call(PATCH(`/api/portal/doers/verification/${encodeURIComponent(caseId)}`), () => db.recordDocumentCheck(caseId, patch, actor), {
    body: patch,
  });
export const assignOnboarding = (caseId: string, supervisorId: string, actor: string) =>
  call(POST(`/api/portal/doers/verification/${encodeURIComponent(caseId)}/assign`), () => db.assignOnboarding(caseId, supervisorId, actor), {
    body: { supervisor_id: supervisorId },
  });
export const decideVerification = (caseId: string, approve: boolean, reason: string, actor: string) =>
  call(POST(`/api/portal/doers/verification/${encodeURIComponent(caseId)}/decide`), () => db.decideVerification(caseId, approve, reason, actor), {
    body: { approve, reason },
  });
export const createModule = (input: Pick<TrainingModule, "title" | "description" | "audience" | "categories" | "has_assessment">, actor: string) =>
  call(POST("/api/portal/training"), () => db.createModule(input, actor), { body: input });
export const updateModule = (id: string, patch: Parameters<typeof db.updateModule>[1], actor: string) =>
  call(PATCH(`/api/portal/training/${encodeURIComponent(id)}/content`), () => db.updateModule(id, patch, actor), {
    latency: 400,
    body: patch,
  });
export const reopenQuote = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/reopen-quote`), () => db.reopenQuote(projectId, actor), {
    body: { project_id: projectId },
  });
export const decideSupervisorApplication = (id: string, approve: boolean, reason: string, actor: string) =>
  call(POST(`/api/portal/supervisor-applications/${encodeURIComponent(id)}/decide`), () => db.decideSupervisorApplication(id, approve, reason, actor), {
    body: { approve, reason },
  });
export const updateApplicationChecks = (id: string, patch: { id_checked: boolean; interview_done: boolean }, actor: string) =>
  call(PATCH(`/api/portal/supervisor-applications/${encodeURIComponent(id)}`), () => db.updateApplicationChecks(id, patch, actor), {
    latency: 120,
    body: patch,
  });
export const addWorkspaceLogins = (count: number, actor: string) =>
  call(POST("/api/portal/workspace-logins"), () => db.addWorkspaceLogins(count, actor), { body: { count } });
export const setModuleState = (id: string, next: TrainingModule["state"], actor: string) =>
  call(PATCH(`/api/portal/training/${encodeURIComponent(id)}`), () => db.setModuleState(id, next, actor), { body: { state: next } });

/* Supervisor -------------------------------------------------------- */

export const sendOffer = (projectId: string, input: OfferInput, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/offer-doer`), () => db.sendOffer(projectId, input, actor), {
    latency: 380,
    body: input,
  });
export const withdrawOffer = (projectDoerId: string, actor: string) =>
  call(POST(`/api/portal/offers/${encodeURIComponent(projectDoerId)}/withdraw`), () => db.withdrawOffer(projectDoerId, actor), {
    body: { project_doer_id: projectDoerId },
  });
export const openToPool = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/open-pool`), () => db.openToPool(projectId, actor), {
    body: { project_id: projectId },
  });
export const selfAssign = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/self-assign`), () => db.selfAssign(projectId, actor), {
    body: { project_id: projectId },
  });
export const setWorkingLink = (projectDoerId: string, url: string, actor: string) =>
  call(POST(`/api/portal/assignments/${encodeURIComponent(projectDoerId)}/working-link`), () => db.setWorkingLink(projectDoerId, url, actor), {
    body: { working_link: url },
  });
export const updateProgress = (projectId: string, percent: number, label: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/progress`), () => db.updateProgress(projectId, percent, label, actor), {
    body: { progress_percent: percent, progress_label: label },
  });
export const postSnapshot = (projectId: string, fileOrName: File | string, note: string, actor: string) => {
  const filename = typeof fileOrName === "string" ? fileOrName : fileOrName.name;
  let body: unknown = { filename, note };
  if (typeof fileOrName !== "string" && typeof FormData !== "undefined") {
    const fd = new FormData();
    fd.append("file", fileOrName);
    fd.append("note", note);
    fd.append("kind", "snapshot");
    body = fd;
  }
  return call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/snapshot`), () => db.postSnapshot(projectId, filename, note, actor), {
    latency: 500,
    body,
  });
};
export const sendMessage = (projectId: string, channel: Channel, bodyText: string, actor: string, attachments: Array<string | File> = []) => {
  const names = attachments.map((a) => (typeof a === "string" ? a : a.name));
  const files = attachments.filter((a): a is File => typeof a !== "string");
  let payload: unknown = { channel, body: bodyText, attachments: names };
  if (files.length && typeof FormData !== "undefined") {
    const fd = new FormData();
    fd.append("channel", channel);
    fd.append("body", bodyText);
    for (const f of files) fd.append("files", f);
    payload = fd;
  }
  return call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/messages`), () => db.sendMessage(projectId, channel, bodyText, actor, names), {
    latency: 160,
    body: payload,
  });
};
export const moderateMessage = (messageId: string, decision: "approve" | "remove", actor: string) =>
  call(POST(`/api/portal/messages/${encodeURIComponent(messageId)}/moderate`), () => db.moderate(messageId, decision, actor), {
    body: { decision },
  });
export const moderateMessagesBulk = (messageIds: string[], decision: "approve" | "remove", actor: string) =>
  call(POST("/api/portal/messages/moderate-bulk"), () => db.moderateBulk(messageIds, decision, actor), {
    body: { message_ids: messageIds, decision },
  });
export const saveQc = (projectId: string, qc: Omit<QcRecord, "completed_at">, actor: string) =>
  call(PATCH(`/api/portal/projects/${encodeURIComponent(projectId)}/qc`), () => db.saveQc(projectId, qc, actor), {
    latency: 120,
    body: qc,
  });
export const addDeliverable = (projectId: string, fileOrName: File | string, kind: "deliverable" | "quality_report", actor: string) => {
  const filename = typeof fileOrName === "string" ? fileOrName : fileOrName.name;
  let body: unknown = { filename, kind };
  if (typeof fileOrName !== "string" && typeof FormData !== "undefined") {
    const fd = new FormData();
    fd.append("file", fileOrName);
    fd.append("kind", kind);
    body = fd;
  }
  return call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/attachments`), () => db.addDeliverable(projectId, filename, kind, actor), {
    latency: 700,
    body,
  });
};
export const removeAttachment = (projectId: string, attachmentId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/attachments/${encodeURIComponent(attachmentId)}/remove`), () => db.removeAttachment(projectId, attachmentId, actor), {
    body: { attachment_id: attachmentId },
  });
export const deliver = (projectId: string, note: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/deliver`), () => db.deliver(projectId, note, actor), {
    latency: 500,
    body: { note },
  });
export const sendBack = (projectId: string, reason: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/send-back`), () => db.sendBack(projectId, reason, actor), {
    body: { reason },
  });
export const respondToFlag = (projectId: string, flagId: string, message: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/flags/${encodeURIComponent(flagId)}/respond`), () => db.respondToFlag(projectId, flagId, message, actor), {
    body: { message },
  });
export const replaceDoer = (projectDoerId: string, reason: string, actor: string) =>
  call(POST(`/api/portal/assignments/${encodeURIComponent(projectDoerId)}/replace`), () => db.replaceDoer(projectDoerId, reason, actor), {
    body: { reason },
  });
export const fetchProjectHistory = (projectId: string, actor: string) =>
  call(GET(`/api/portal/projects/${encodeURIComponent(projectId)}/history`), () => db.projectHistory(projectId, actor), 120);
export const submitOwnWork = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/submit-own-work`), () => db.submitOwnWork(projectId, actor), {
    body: { project_id: projectId },
  });
export const releasePayout = (projectId: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/release-payout`), () => db.releasePayout(projectId, actor), {
    body: { project_id: projectId },
  });
export const updateDoerBrief = (projectId: string, input: { doer_brief: string; attachment_visibility: Record<string, boolean> }, actor: string) =>
  call(PATCH(`/api/portal/projects/${encodeURIComponent(projectId)}/doer-brief`), () => db.updateDoerBrief(projectId, input, actor), {
    body: input,
  });
export const rateDoer = (projectId: string, input: { project_doer_id: string; quality: number; timeliness: number; communication: number; notes: string }, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/rate-doer`), () => db.rateDoer(projectId, input, actor), {
    body: input,
  });
export const conductDoerAction = (doerId: string, input: { action: DoerConductEntry["action"]; level?: DoerLevel; reason: string }, actor: string) =>
  call(POST(`/api/portal/doers/${encodeURIComponent(doerId)}/conduct`), () => db.conductDoerAction(doerId, input, actor), {
    body: input,
  });
export const sendPaidRevisionQuote = (projectId: string, input: QuoteInput, actor: string, idempotencyKey?: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/paid-revision-quote`), () => db.sendPaidRevisionQuote(projectId, input, actor), {
    latency: 420,
    body: input,
    idempotencyKey: idempotencyKey ?? newIdempotencyKey("revquote"),
  });
export const fetchChargebackEvidence = (projectId: string, actor: string) =>
  call(GET(`/api/portal/projects/${encodeURIComponent(projectId)}/chargeback-evidence`), () => db.buildChargebackEvidence(projectId, actor), 120);

/* Support ----------------------------------------------------------- */

export const replyTicket = (ticketId: string, bodyText: string, actor: string, internal: boolean) =>
  call(POST(`/api/portal/tickets/${encodeURIComponent(ticketId)}/entries`), () => db.replyTicket(ticketId, bodyText, actor, internal), {
    body: { body: bodyText, internal },
  });
export const updateTicket = (ticketId: string, patch: Partial<Pick<Ticket, "status" | "priority" | "owner_id" | "category">>, actor: string) =>
  call(PATCH(`/api/portal/tickets/${encodeURIComponent(ticketId)}`), () => db.updateTicket(ticketId, patch, actor), {
    body: patch,
  });
export const resolveTicket = (ticketId: string, resolution: string, actor: string) =>
  call(POST(`/api/portal/tickets/${encodeURIComponent(ticketId)}/resolve`), () => db.resolveTicket(ticketId, resolution, actor), {
    body: { resolution },
  });
export const recommendRefund = (ticketId: string, rec: NonNullable<Ticket["refund_recommendation"]>, actor: string) =>
  call(POST(`/api/portal/tickets/${encodeURIComponent(ticketId)}/recommend-refund`), () => db.recommendRefund(ticketId, rec, actor), {
    body: rec,
  });
/** PRD 11.3: the project's supervisor decides doer fault before QQD executes. */
export const decideLiability = (refundId: string, decision: NonNullable<RefundRequest["liability_decision"]>, reason: string, partialInr: number | null, actor: string) =>
  call(POST(`/api/portal/refunds/${encodeURIComponent(refundId)}/liability`), () => db.decideLiability(refundId, decision, reason, partialInr, actor), {
    body: { liability_decision: decision, reason, partial_payout_inr: partialInr },
  });

/* Operator ---------------------------------------------------------- */

export const escalateToSupport = (projectId: string, input: Parameters<typeof db.escalateToSupport>[1], actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/escalate`), () => db.escalateToSupport(projectId, input, actor), {
    body: input,
  });
export const reassignSupervisor = (projectId: string, supervisorId: string, reason: string, actor: string) =>
  call(POST(`/api/portal/projects/${encodeURIComponent(projectId)}/reassign-supervisor`), () => db.reassignSupervisor(projectId, supervisorId, reason, actor), {
    body: { supervisor_id: supervisorId, reason },
  });
export const fetchPreferences = (actor: string) => call(GET("/api/portal/me/preferences"), () => db.readPreferences(actor), 120);
export const savePreferences = (actor: string, prefs: Parameters<typeof db.savePreferences>[1]) =>
  call(PATCH("/api/portal/me/preferences"), () => db.savePreferences(actor, prefs), { body: prefs });
export const setOnDuty = (operatorId: string, onDuty: boolean) =>
  call(POST("/api/portal/me/duty"), () => db.setOnDuty(operatorId, onDuty), { latency: 100, body: { on_duty: onDuty } });
export const markNotificationRead = (segment: Segment, id: string | "all") =>
  call(POST("/api/portal/notifications/read"), () => db.markNotificationRead(segment, id), { latency: 80, body: { id } });

/* Demo-only simulations of the other surfaces ----------------------- */

export const demo = {
  clientPays: (projectId: string) => call(POST("demo"), () => db.simulatePayment(projectId), 500),
  doerResponds: (projectDoerId: string, accept: boolean) => call(POST("demo"), () => db.simulateOfferResponse(projectDoerId, accept), 400),
  doerSubmits: (projectId: string) => call(POST("demo"), () => db.simulateDoerSubmit(projectId), 400),
  clientRevises: (projectId: string, reason: string) => call(POST("demo"), () => db.simulateClientRevision(projectId, reason), 400),
  clientApproves: (projectId: string) => call(POST("demo"), () => db.simulateClientApprove(projectId), 400),
  clientFlags: (projectId: string, reason: "delay" | "quality" | "communication" | "scope_mismatch" | "other", detail: string) =>
    call(POST("demo"), () => db.simulateClientFlag(projectId, reason, detail), 400),
  requestPaidRevision: (projectId: string, reason: string) =>
    call(POST("demo"), () => db.requestPaidRevision(projectId, reason), 400),
};
