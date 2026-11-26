import { assertSegment, checkIdempotency, computeTdsPaise, saveIdempotency, type StaffContext } from "../_shared/admin.ts";
import { jsonResponse } from "../_shared/cors.ts";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) out[k] = v;
    return out;
  }
  return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
}

export async function handleWriteRoute(ctx: StaffContext, method: string, path: string, req: Request): Promise<Response | null> {
  const idemKey = req.headers.get("idempotency-key");
  const body = await readBody(req);

  const quoteMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/(quote|paid-revision-quote)$/);
  if (method === "POST" && quoteMatch) {
    const denied = assertSegment(ctx, "qqd");
    if (denied) return denied;
    const projectId = decodeURIComponent(quoteMatch[1]!);
    const isPaidRevision = quoteMatch[2] === "paid-revision-quote";

    const cached = await checkIdempotency(ctx.admin, idemKey, path);
    if (cached) return cached;

    const amount = Number(body.amount);
    const duration = Number(body.delivery_duration_hours);
    const cost = Number(body.expected_doer_cost_inr);
    const currency = typeof body.currency === "string" ? body.currency : "INR";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(duration) || duration <= 0) {
      return jsonResponse({ message: "Enter a valid positive quote amount and duration." }, 400);
    }

    const { data: proj } = await ctx.admin.from("projects").select("id, deadline_utc, status").eq("id", projectId).maybeSingle();
    if (!proj) return jsonResponse({ message: "Project not found." }, 404);
    const row = proj as { id: string; deadline_utc: string | null; status: string };
    const expiresAt = row.deadline_utc ? new Date(new Date(row.deadline_utc).getTime() - duration * 3_600_000).toISOString() : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      return jsonResponse({ message: "The client deadline cannot be met with this delivery duration." }, 422);
    }

    const { error } = await ctx.admin
      .from("projects")
      .update({
        status: "quoted",
        user_price_paise: Math.round(amount),
        quote_currency: currency,
        quote_amount_inr: Math.round(amount),
        expected_doer_cost_inr: Number.isFinite(cost) ? Math.round(cost) : null,
        delivery_duration_hours: Math.round(duration),
        quote_note: note,
        quote_expires_at: expiresAt,
        quote_sent_at: new Date().toISOString(),
        qqd_id: ctx.user.id,
        paid_revision_pending: isPaidRevision,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (error) return jsonResponse({ message: error.message }, 500);
    const result = { ok: true, project_id: projectId, status: "awaiting_payment" };
    await saveIdempotency(ctx.admin, idemKey, path, ctx.user.id, 200, result);
    return jsonResponse(result);
  }

  const assignSupMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/(assign-supervisor|reassign-supervisor)$/);
  if (method === "POST" && assignSupMatch) {
    const denied = assertSegment(ctx, "qqd");
    if (denied) return denied;
    const projectId = decodeURIComponent(assignSupMatch[1]!);
    const supervisorId = typeof body.supervisor_id === "string" ? body.supervisor_id : "";
    if (!supervisorId) return jsonResponse({ message: "Select a supervisor." }, 400);

    const { error } = await ctx.admin
      .from("projects")
      .update({ supervisor_id: supervisorId, supervisor_assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  const offerMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/offer-doer$/);
  if (method === "POST" && offerMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const projectId = decodeURIComponent(offerMatch[1]!);
    const { data: proj } = await ctx.admin.from("projects").select("id, supervisor_id").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
    if (!proj) return jsonResponse({ message: "That project no longer exists." }, 404);

    const doerId = typeof body.doer_id === "string" ? body.doer_id : "";
    const discipline = typeof body.discipline === "string" ? body.discipline : "";
    const payout = Number(body.payout_amount_inr);
    if (!doerId || !discipline || !Number.isFinite(payout) || payout <= 0) {
      return jsonResponse({ message: "Valid doer, discipline, and payout required." }, 400);
    }

    const { count: activeCount } = await ctx.admin
      .from("project_doers")
      .select("id", { count: "exact", head: true })
      .eq("doer_id", doerId)
      .eq("status", "accepted");
    if ((activeCount ?? 0) >= 3) {
      return jsonResponse({ message: "This doer already holds 3 active projects." }, 409);
    }

    const { error } = await ctx.admin.from("project_doers").insert({
      project_id: projectId,
      doer_id: doerId,
      doer_code: `R-${doerId.slice(0, 4).toUpperCase()}`,
      discipline,
      payout_amount_inr: Math.round(payout),
      scope_note: typeof body.scope_note === "string" ? body.scope_note.trim() || null : null,
      required_module_id: typeof body.required_module_id === "string" ? body.required_module_id : null,
      offer_expires_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    });
    if (error) return jsonResponse({ message: error.message }, 400);
    return jsonResponse({ ok: true });
  }

  const workingLinkMatch = path.match(/^\/api\/portal\/assignments\/([^/]+)\/working-link$/);
  if (method === "POST" && workingLinkMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const pdId = decodeURIComponent(workingLinkMatch[1]!);
    const url = typeof body.working_link === "string" ? body.working_link.trim() : "";
    if (!url.startsWith("https://")) return jsonResponse({ message: "Workspace link must use https." }, 400);

    const { data: pd } = await ctx.admin.from("project_doers").select("id, project_id").eq("id", pdId).maybeSingle();
    if (!pd) return jsonResponse({ message: "Assignment not found." }, 404);
    const projectId = (pd as { project_id: string }).project_id;
    const { data: owns } = await ctx.admin.from("projects").select("id").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
    if (!owns) return jsonResponse({ message: "Assignment not found." }, 404);

    await ctx.admin.from("project_doers").update({ working_link: url }).eq("id", pdId);
    await ctx.admin.from("projects").update({ working_doc_url: url, updated_at: new Date().toISOString() }).eq("id", projectId);
    return jsonResponse({ ok: true });
  }

  const offerWithdrawMatch = path.match(/^\/api\/portal\/offers\/([^/]+)\/withdraw$/);
  if (method === "POST" && offerWithdrawMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const pdId = decodeURIComponent(offerWithdrawMatch[1]!);
    const { data: pd } = await ctx.admin.from("project_doers").select("id, project_id, status").eq("id", pdId).maybeSingle();
    if (!pd) return jsonResponse({ message: "Offer not found." }, 404);
    const projectId = (pd as { project_id: string }).project_id;
    const { data: owns } = await ctx.admin.from("projects").select("id").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
    if (!owns) return jsonResponse({ message: "Offer not found." }, 404);
    await ctx.admin.from("project_doers").update({ status: "removed" }).eq("id", pdId).eq("status", "offered");
    return jsonResponse({ ok: true });
  }

  const replaceDoerMatch = path.match(/^\/api\/portal\/assignments\/([^/]+)\/replace$/);
  if (method === "POST" && replaceDoerMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const pdId = decodeURIComponent(replaceDoerMatch[1]!);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 10) return jsonResponse({ message: "Provide an internal replacement reason." }, 400);
    const { data: pd } = await ctx.admin.from("project_doers").select("id, project_id").eq("id", pdId).maybeSingle();
    if (!pd) return jsonResponse({ message: "Assignment not found." }, 404);
    const projectId = (pd as { project_id: string }).project_id;
    const { data: owns } = await ctx.admin.from("projects").select("id").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
    if (!owns) return jsonResponse({ message: "Assignment not found." }, 404);
    await ctx.admin.from("project_doers").update({ status: "removed", decline_reason: reason, working_link: null }).eq("id", pdId);
    await ctx.admin.from("projects").update({ doer_id: null, working_doc_url: null, failed_offer_count: 0, in_open_pool: false, updated_at: new Date().toISOString() }).eq("id", projectId);
    return jsonResponse({ ok: true });
  }

  const poolSelfMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/(open-pool|self-assign)$/);
  if (method === "POST" && poolSelfMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const projectId = decodeURIComponent(poolSelfMatch[1]!);
    const mode = poolSelfMatch[2]!;
    const { data: proj } = await ctx.admin.from("projects").select("id, supervisor_id, failed_offer_count").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
    if (!proj) return jsonResponse({ message: "That project no longer exists." }, 404);
    if (((proj as { failed_offer_count?: number }).failed_offer_count ?? 0) < 2) {
      return jsonResponse({ message: "Unlocks only after 2 failed direct offers (FR-SV-008)." }, 409);
    }
    const patch = mode === "open-pool" ? { in_open_pool: true } : { self_assigned: true, in_open_pool: false };
    await ctx.admin.from("projects").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", projectId);
    return jsonResponse({ ok: true });
  }

  const sendMsgMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/messages$/);
  if (method === "POST" && sendMsgMatch) {
    const projectId = decodeURIComponent(sendMsgMatch[1]!);
    const channel = body.channel === "internal" ? "supervisor_doer" : "user_supervisor";
    if (ctx.segment === "supervisor") {
      const { data: owns } = await ctx.admin.from("projects").select("id").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
      if (!owns) return jsonResponse({ message: "That project no longer exists." }, 404);
    }
    const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
    if (!text) return jsonResponse({ message: "Write a message first." }, 400);
    const { data: thread } = await ctx.admin.from("threads").select("id").eq("project_id", projectId).eq("kind", channel).maybeSingle();
    if (!thread) return jsonResponse({ message: "Thread not found." }, 404);
    const { data: msg, error } = await ctx.admin.rpc("submit_screened_message", {
      p_thread: (thread as { id: string }).id,
      p_author: ctx.user.id,
      p_body: text,
      p_state: "delivered",
      p_held_reason: null,
      p_screen_note: null,
    });
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse(msg, 201);
  }

  const doerBriefMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/doer-brief$/);
  if (method === "PATCH" && doerBriefMatch) {
    const denied = assertSegment(ctx, "supervisor", "qqd");
    if (denied) return denied;
    const projectId = decodeURIComponent(doerBriefMatch[1]!);
    const brief = typeof body.doer_brief === "string" ? body.doer_brief.trim().slice(0, 8000) : null;
    const { error } = await ctx.admin.from("projects").update({ doer_brief: brief, updated_at: new Date().toISOString() }).eq("id", projectId);
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  const qcMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/qc$/);
  if (method === "PATCH" && qcMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const projectId = decodeURIComponent(qcMatch[1]!);
    const { error } = await ctx.admin
      .from("projects")
      .update({ qc_data: body, updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("supervisor_id", ctx.user.id);
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  const deliverMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/(deliver|send-back|progress|release-payout)$/);
  if (method === "POST" && deliverMatch) {
    const denied = assertSegment(ctx, "supervisor");
    if (denied) return denied;
    const projectId = decodeURIComponent(deliverMatch[1]!);
    const op = deliverMatch[2]!;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };

    if (op === "deliver") {
      patch.status = "delivered";
      patch.delivered_at = now;
      patch.progress_pct = 100;
      patch.progress_label = "Delivered";
      patch.delivery_note = typeof body.note === "string" ? body.note.trim() : null;
    } else if (op === "send-back") {
      patch.status = "in_progress";
      patch.qc_data = null;
      patch.last_bounce_reason = typeof body.reason === "string" ? body.reason.trim() : null;
    } else if (op === "progress") {
      patch.progress_pct = Number(body.progress_percent ?? 0);
      patch.progress_label = typeof body.progress_label === "string" ? body.progress_label.trim() : "";
      patch.progress_updated_at = now;
    } else if (op === "release-payout") {
      patch.payout_released_at = now;
    }

    const { error } = await ctx.admin.from("projects").update(patch).eq("id", projectId).eq("supervisor_id", ctx.user.id);
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  const moderateMatch = path.match(/^\/api\/portal\/messages\/([^/]+)\/moderate$/);
  if (method === "POST" && moderateMatch) {
    const msgId = decodeURIComponent(moderateMatch[1]!);
    const decision = body.decision === "approve" ? "approved" : body.decision === "remove" ? "removed" : null;
    if (!decision) return jsonResponse({ message: "Invalid moderation decision." }, 400);
    const { error } = await ctx.admin
      .from("messages")
      .update({ state: decision, moderated_by: ctx.user.id, moderated_at: new Date().toISOString() })
      .eq("id", msgId)
      .eq("state", "held");
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && path === "/api/portal/messages/moderate-bulk") {
    const ids = Array.isArray(body.message_ids) ? body.message_ids.filter((x): x is string => typeof x === "string") : [];
    const decision = body.decision === "approve" ? "approved" : body.decision === "remove" ? "removed" : null;
    if (!ids.length || !decision) return jsonResponse({ message: "Select messages and a valid decision." }, 400);
    await ctx.admin
      .from("messages")
      .update({ state: decision, moderated_by: ctx.user.id, moderated_at: new Date().toISOString() })
      .in("id", ids)
      .eq("state", "held");
    return jsonResponse({ count: ids.length, decision: body.decision });
  }

  const payoutExecMatch = path.match(/^\/api\/portal\/payouts\/([^/]+)\/execute$/);
  if (method === "POST" && payoutExecMatch) {
    const denied = assertSegment(ctx, "qqd");
    if (denied) return denied;
    const cached = await checkIdempotency(ctx.admin, idemKey, path);
    if (cached) return cached;

    const pdId = decodeURIComponent(payoutExecMatch[1]!);
    const { data: pd } = await ctx.admin.from("project_doers").select("*").eq("id", pdId).maybeSingle();
    if (!pd) return jsonResponse({ message: "Payout line not found." }, 404);
    const row = pd as { id: string; project_id: string; doer_id: string; payout_amount_inr: number; partial_payout_inr: number | null; liability_decision: string | null };
    const gross = row.liability_decision === "at_fault" ? 0 : row.liability_decision === "partial" && row.partial_payout_inr !== null ? row.partial_payout_inr : row.payout_amount_inr;
    const tds = computeTdsPaise(0, gross);
    const net = Math.max(0, gross - tds);

    await ctx.admin.from("project_doers").update({ payout_status: net === 0 ? "withheld" : "released" }).eq("id", pdId);
    const result = { ok: true, project_doer_id: pdId, gross_inr: gross, tds_inr: tds, net_inr: net };
    await saveIdempotency(ctx.admin, idemKey, path, ctx.user.id, 200, result);
    return jsonResponse(result);
  }

  const refundLiabilityMatch = path.match(/^\/api\/portal\/refunds\/([^/]+)\/(liability|execute)$/);
  if (method === "POST" && refundLiabilityMatch) {
    const refundId = decodeURIComponent(refundLiabilityMatch[1]!);
    const action = refundLiabilityMatch[2]!;
    if (action === "liability") {
      const denied = assertSegment(ctx, "supervisor");
      if (denied) return denied;
      const { error } = await ctx.admin
        .from("refund_requests")
        .update({
          liability_decision: body.liability_decision,
          liability_reason: body.reason,
          liability_decided_by: ctx.user.id,
        })
        .eq("id", refundId);
      if (error) return jsonResponse({ message: error.message }, 500);
      return jsonResponse({ ok: true });
    }
    const denied = assertSegment(ctx, "qqd");
    if (denied) return denied;
    const cached = await checkIdempotency(ctx.admin, idemKey, path);
    if (cached) return cached;
    const { error } = await ctx.admin
      .from("refund_requests")
      .update({ status: "executed", executed_by: ctx.user.id, executed_at: new Date().toISOString() })
      .eq("id", refundId)
      .not("liability_decision", "is", null);
    if (error) return jsonResponse({ message: error.message }, 400);
    const result = { ok: true, refund_id: refundId, status: "executed" };
    await saveIdempotency(ctx.admin, idemKey, path, ctx.user.id, 200, result);
    return jsonResponse(result);
  }

  const rateDoerMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/rate-doer$/);
  if (method === "POST" && rateDoerMatch) {
    const denied = assertSegment(ctx, "supervisor", "qqd");
    if (denied) return denied;
    const projectId = decodeURIComponent(rateDoerMatch[1]!);
    const pdId = typeof body.project_doer_id === "string" ? body.project_doer_id : "";
    const { data: pd } = await ctx.admin.from("project_doers").select("doer_id").eq("id", pdId).eq("project_id", projectId).maybeSingle();
    if (!pd) return jsonResponse({ message: "Doer assignment not found." }, 404);
    const { error } = await ctx.admin.from("doer_ratings").upsert({
      project_id: projectId,
      project_doer_id: pdId,
      doer_id: (pd as { doer_id: string }).doer_id,
      quality: Number(body.quality),
      timeliness: Number(body.timeliness),
      communication: Number(body.communication),
      notes: typeof body.notes === "string" ? body.notes.trim() : "",
      rated_by: ctx.user.id,
    });
    if (error) return jsonResponse({ message: error.message }, 400);
    return jsonResponse({ ok: true });
  }

  const conductMatch = path.match(/^\/api\/portal\/doers\/([^/]+)\/conduct$/);
  if (method === "POST" && conductMatch) {
    const denied = assertSegment(ctx, "qqd");
    if (denied) return denied;
    const doerId = decodeURIComponent(conductMatch[1]!);
    const action = typeof body.action === "string" ? body.action : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    await ctx.admin.from("doer_conduct_log").insert({ doer_id: doerId, action, reason, actor_id: ctx.user.id });
    if (action === "review_cleared") {
      await ctx.admin.from("profiles").update({ review_flagged: false }).eq("id", doerId);
    } else if (action === "suspended") {
      await ctx.admin.from("profiles").update({ suspended_until: new Date(Date.now() + 7 * 86_400_000).toISOString(), available: false }).eq("id", doerId);
    } else if (action === "restored") {
      await ctx.admin.from("profiles").update({ suspended_until: null, review_flagged: false }).eq("id", doerId);
    } else if (action === "warning") {
      const { data: p } = await ctx.admin.from("profiles").select("warning_count").eq("id", doerId).maybeSingle();
      const prev = ((p as { warning_count?: number } | null)?.warning_count) ?? 0;
      await ctx.admin.from("profiles").update({ warning_count: prev + 1 }).eq("id", doerId);
    }
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && path === "/api/portal/me/duty") {
    await ctx.admin.from("profiles").update({ on_duty: Boolean(body.on_duty) }).eq("id", ctx.user.id);
    return jsonResponse({ ok: true });
  }

  if (method === "PATCH" && path === "/api/portal/me/preferences") {
    await ctx.admin.from("portal_operator_preferences").upsert({ operator_id: ctx.user.id, ...body, updated_at: new Date().toISOString() });
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && path === "/api/portal/notifications/read") {
    const id = typeof body.id === "string" ? body.id : "all";
    const now = new Date().toISOString();
    let q = ctx.admin.from("notifications").update({ read_at: now }).eq("user_id", ctx.user.id).is("read_at", null);
    if (id !== "all") q = q.eq("id", id);
    await q;
    return jsonResponse({ ok: true });
  }

  return null;
}
