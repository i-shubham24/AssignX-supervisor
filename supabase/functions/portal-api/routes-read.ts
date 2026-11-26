import { type StaffContext, mapDbStatusToPortal } from "../_shared/admin.ts";
import { jsonResponse } from "../_shared/cors.ts";

interface DbProjectRow {
  id: string;
  code: string | null;
  user_id: string;
  supervisor_id: string | null;
  doer_id: string | null;
  category: string;
  status: string;
  title: string | null;
  description: string | null;
  urgency: string | null;
  deadline_utc: string | null;
  user_price_paise: number | null;
  quote_currency: string | null;
  quote_amount_inr: number | null;
  quote_note: string | null;
  delivery_duration_hours: number | null;
  quote_expires_at: string | null;
  quote_sent_at: string | null;
  credits_applied_inr: number | null;
  expected_doer_cost_inr: number | null;
  qqd_id: string | null;
  supervisor_assigned_at: string | null;
  progress_pct: number | null;
  progress_label: string | null;
  progress_updated_at: string | null;
  flag_count: number | null;
  user_revision_count: number | null;
  qc_bounce_count: number | null;
  last_bounce_reason: string | null;
  user_revision_reason: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  approved_at: string | null;
  payout_released_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  failed_offer_count: number | null;
  in_open_pool: boolean | null;
  self_assigned: boolean | null;
  qc_data: unknown;
  delivery_note: string | null;
  doer_brief: string | null;
  client_rating: number | null;
  client_review_note: string | null;
  paid_revision_pending: boolean | null;
  invoice_number: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

const PROJECT_SELECT =
  "id, code, user_id, supervisor_id, doer_id, category, status, title, description, urgency, deadline_utc, user_price_paise, quote_currency, quote_amount_inr, quote_note, delivery_duration_hours, quote_expires_at, quote_sent_at, credits_applied_inr, expected_doer_cost_inr, qqd_id, supervisor_assigned_at, progress_pct, progress_label, progress_updated_at, flag_count, user_revision_count, qc_bounce_count, last_bounce_reason, user_revision_reason, paid_at, delivered_at, approved_at, payout_released_at, cancelled_at, cancellation_reason, failed_offer_count, in_open_pool, self_assigned, qc_data, delivery_note, doer_brief, client_rating, client_review_note, paid_revision_pending, invoice_number, razorpay_payment_id, created_at, updated_at";

async function hydrateProjects(ctx: StaffContext, rows: DbProjectRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const clientIds = Array.from(new Set(rows.map((r) => r.user_id)));

  const [{ data: clients }, { data: doerRows }, { data: ratingRows }] = await Promise.all([
    ctx.admin.from("profiles").select("id, full_name, country").in("id", clientIds),
    ctx.admin.from("project_doers").select("*").in("project_id", ids),
    ctx.admin.from("doer_ratings").select("*").in("project_id", ids),
  ]);

  const clientMap = new Map(
    ((clients ?? []) as { id: string; full_name: string | null; country: string | null }[]).map((c) => [c.id, c]),
  );

  return rows.map((r) => {
    const client = clientMap.get(r.user_id);
    const quoteInr = r.quote_amount_inr ?? r.user_price_paise;
    const expectedCost = r.expected_doer_cost_inr;
    const doers = ((doerRows ?? []) as Record<string, unknown>[]).filter((pd) => pd.project_id === r.id);
    const ratings = ((ratingRows ?? []) as Record<string, unknown>[]).filter((rt) => rt.project_id === r.id);

    return {
      id: r.id,
      code: r.code ?? `AX-${r.id.slice(0, 6).toUpperCase()}`,
      client: {
        id: r.user_id,
        display_name: client?.full_name || "AssignX Client",
        segment: "individual",
        country: client?.country || "IN",
        currency: r.quote_currency || "INR",
        projects_count: 1,
      },
      category: r.category,
      title: r.title || `Project ${r.code ?? r.id.slice(0, 6)}`,
      description: r.description || "",
      category_answers: [],
      urgency: (r.urgency as "standard" | "express" | "urgent") || "standard",
      deadline_utc: r.deadline_utc,
      status: mapDbStatusToPortal(r.status),
      quote_amount: r.user_price_paise,
      quote_currency: r.quote_currency || "INR",
      quote_amount_inr: quoteInr,
      quote_note: r.quote_note,
      delivery_duration_hours: r.delivery_duration_hours,
      quote_expires_at: r.quote_expires_at,
      quote_sent_at: r.quote_sent_at,
      credits_applied_inr: r.credits_applied_inr ?? 0,
      expected_doer_cost_inr: expectedCost,
      margin_inr: quoteInr !== null && expectedCost !== null ? quoteInr - expectedCost : null,
      qqd_id: r.qqd_id,
      supervisor_id: r.supervisor_id,
      supervisor_assigned_at: r.supervisor_assigned_at,
      progress_percent: r.progress_pct,
      progress_label: r.progress_label,
      progress_updated_at: r.progress_updated_at,
      flag_count: r.flag_count ?? 0,
      revision_count: r.user_revision_count ?? 0,
      qc_bounce_count: r.qc_bounce_count ?? 0,
      last_bounce_reason: r.last_bounce_reason,
      client_revision_reason: r.user_revision_reason,
      paid_at: r.paid_at,
      delivered_at: r.delivered_at,
      approved_at: r.approved_at,
      payout_released_at: r.payout_released_at,
      cancelled_at: r.cancelled_at,
      cancellation_reason: r.cancellation_reason,
      created_at: r.created_at,
      updated_at: r.updated_at,
      doers,
      doer_brief: r.doer_brief,
      client_rating: r.client_rating,
      client_review_note: r.client_review_note,
      doer_ratings: ratings,
      paid_revision_pending: Boolean(r.paid_revision_pending),
      invoice_number: r.invoice_number,
      razorpay_payment_id: r.razorpay_payment_id,
      failed_offer_count: r.failed_offer_count ?? 0,
      in_open_pool: Boolean(r.in_open_pool),
      self_assigned: Boolean(r.self_assigned),
      qc: r.qc_data,
      delivery_note: r.delivery_note,
      attachments: [],
      flags: [],
      unread_client: 0,
      unread_internal: 0,
      held_count: 0,
    };
  });
}

export async function handleReadRoute(ctx: StaffContext, path: string, url: URL): Promise<Response | null> {
  if (path === "/api/portal/me") {
    return jsonResponse({
      id: ctx.profile.id,
      full_name: ctx.profile.full_name || ctx.user.email || "Portal staff",
      email: ctx.user.email ?? "",
      segment: ctx.segment,
      categories: ctx.profile.categories ?? [],
      on_duty: ctx.profile.on_duty ?? true,
      active_project_count: 0,
      average_rating: null,
      is_lead: Boolean(ctx.profile.is_lead),
      joined_at: ctx.profile.created_at,
    });
  }

  if (path === "/api/portal/people") {
    const { data } = await ctx.admin
      .from("profiles")
      .select("id, full_name, role, portal_segment, categories, on_duty, is_lead, created_at")
      .or("portal_segment.not.is.null,role.eq.supervisor,role.eq.admin");
    return jsonResponse(
      ((data ?? []) as Record<string, unknown>[]).map((p) => ({
        id: p.id,
        full_name: p.full_name || "Staff member",
        email: "",
        segment: p.portal_segment || (p.role === "admin" ? "qqd" : "supervisor"),
        categories: p.categories ?? [],
        on_duty: Boolean(p.on_duty),
        active_project_count: 0,
        average_rating: null,
        is_lead: Boolean(p.is_lead),
        joined_at: p.created_at,
      })),
    );
  }

  if (path.startsWith("/api/portal/queues/")) {
    const queue = path.replace("/api/portal/queues/", "");
    if (queue === "moderation") {
      const { data: heldMsgs } = await ctx.admin
        .from("messages")
        .select("id, thread_id, author_id, body, state, held_reason, screen_note, moderated_by, moderated_at, created_at")
        .eq("state", "held")
        .order("created_at", { ascending: true })
        .limit(100);
      if (!heldMsgs?.length) return jsonResponse([]);
      const threadIds = Array.from(new Set(heldMsgs.map((m) => String((m as { thread_id: string }).thread_id))));
      const { data: threads } = await ctx.admin.from("threads").select("id, project_id, kind").in("id", threadIds);
      const threadMap = new Map(((threads ?? []) as { id: string; project_id: string; kind: string }[]).map((t) => [t.id, t]));
      const projIds = Array.from(new Set(Array.from(threadMap.values()).map((t) => t.project_id)));
      let pq = ctx.admin.from("projects").select("id, code, title, category, status, supervisor_id").in("id", projIds);
      if (ctx.segment === "supervisor") pq = pq.eq("supervisor_id", ctx.user.id);
      const { data: projs } = await pq;
      const projMap = new Map(((projs ?? []) as Record<string, unknown>[]).map((p) => [String(p.id), p]));

      const items = heldMsgs
        .map((m) => {
          const msg = m as Record<string, unknown>;
          const thread = threadMap.get(String(msg.thread_id));
          const proj = thread ? projMap.get(thread.project_id) : undefined;
          if (!thread || !proj) return null;
          return {
            message: {
              id: msg.id,
              project_id: proj.id,
              channel: thread.kind === "supervisor_doer" ? "internal" : "client",
              sender_role: "expert",
              sender_label: "Participant",
              sender_id: msg.author_id,
              discipline: null,
              body: msg.body,
              state: msg.state,
              held_reason: msg.held_reason,
              screen_note: msg.screen_note,
              moderated_by: msg.moderated_by,
              moderated_at: msg.moderated_at,
              created_at: msg.created_at,
              attachments: [],
            },
            project: {
              id: proj.id,
              code: proj.code ?? `AX-${String(proj.id).slice(0, 6).toUpperCase()}`,
              title: proj.title ?? "Project",
              category: proj.category,
              status: mapDbStatusToPortal(String(proj.status)),
            },
            context: [],
          };
        })
        .filter(Boolean);
      return jsonResponse(items);
    }

    if (queue === "disbursement") {
      if (ctx.segment !== "qqd") return jsonResponse({ message: "Only QQD reads disbursements." }, 403);
      const { data: payouts } = await ctx.admin
        .from("razorpay_payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return jsonResponse(payouts ?? []);
    }

    let q = ctx.admin.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false }).limit(200);
    if (ctx.segment === "supervisor") q = q.eq("supervisor_id", ctx.user.id);
    const { data, error } = await q;
    if (error) return jsonResponse({ message: error.message }, 500);
    return jsonResponse(await hydrateProjects(ctx, (data ?? []) as DbProjectRow[]));
  }

  const projectMatch = path.match(/^\/api\/portal\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]!);
    let q = ctx.admin.from("projects").select(PROJECT_SELECT).eq("id", id);
    if (ctx.segment === "supervisor") q = q.eq("supervisor_id", ctx.user.id);
    const { data, error } = await q.maybeSingle();
    if (error || !data) return jsonResponse({ message: "That project no longer exists." }, 404);
    const [hydrated] = await hydrateProjects(ctx, [data as DbProjectRow]);
    return jsonResponse(hydrated);
  }

  const msgMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/messages$/);
  if (msgMatch) {
    const projectId = decodeURIComponent(msgMatch[1]!);
    const channel = url.searchParams.get("channel") === "internal" ? "supervisor_doer" : "user_supervisor";
    if (ctx.segment === "supervisor") {
      const { data: owns } = await ctx.admin.from("projects").select("id").eq("id", projectId).eq("supervisor_id", ctx.user.id).maybeSingle();
      if (!owns) return jsonResponse({ message: "That project no longer exists." }, 404);
    }
    const { data: thread } = await ctx.admin.from("threads").select("id").eq("project_id", projectId).eq("kind", channel).maybeSingle();
    if (!thread) return jsonResponse([]);
    const { data: msgs } = await ctx.admin
      .from("messages")
      .select("id, author_id, body, state, held_reason, screen_note, moderated_by, moderated_at, created_at")
      .eq("thread_id", (thread as { id: string }).id)
      .order("created_at", { ascending: true });
    return jsonResponse(
      ((msgs ?? []) as Record<string, unknown>[]).map((m) => ({
        id: m.id,
        project_id: projectId,
        channel: channel === "supervisor_doer" ? "internal" : "client",
        sender_role: m.author_id === ctx.user.id ? "coordinator" : "client",
        sender_label: m.author_id === ctx.user.id ? ctx.profile.full_name || "Coordinator" : "Participant",
        sender_id: m.author_id,
        discipline: null,
        body: m.body,
        state: m.state ?? "delivered",
        held_reason: m.held_reason ?? null,
        screen_note: m.screen_note ?? null,
        moderated_by: m.moderated_by ?? null,
        moderated_at: m.moderated_at ?? null,
        created_at: m.created_at,
        attachments: [],
      })),
    );
  }

  const evidenceMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/chargeback-evidence$/);
  if (evidenceMatch) {
    const projectId = decodeURIComponent(evidenceMatch[1]!);
    let q = ctx.admin.from("projects").select(PROJECT_SELECT).eq("id", projectId);
    if (ctx.segment === "supervisor") q = q.eq("supervisor_id", ctx.user.id);
    const { data: proj } = await q.maybeSingle();
    if (!proj) return jsonResponse({ message: "That project no longer exists." }, 404);
    const row = proj as DbProjectRow;
    const { data: clientThread } = await ctx.admin.from("threads").select("id").eq("project_id", projectId).eq("kind", "user_supervisor").maybeSingle();
    const { data: msgs } = clientThread
      ? await ctx.admin.from("messages").select("author_id, body, created_at").eq("thread_id", (clientThread as { id: string }).id).order("created_at", { ascending: true })
      : { data: [] };
    return jsonResponse({
      generated_at: new Date().toISOString(),
      project_code: row.code ?? row.id,
      title: row.title ?? "",
      category: row.category,
      status: mapDbStatusToPortal(row.status),
      invoice_number: row.invoice_number,
      razorpay_payment_id: row.razorpay_payment_id,
      quote_amount: row.user_price_paise,
      quote_currency: row.quote_currency ?? "INR",
      paid_at: row.paid_at,
      delivered_at: row.delivered_at,
      approved_at: row.approved_at,
      brief: row.description ?? "",
      delivery_note: row.delivery_note,
      deliverables: [],
      client_messages: ((msgs ?? []) as { author_id: string; body: string; created_at: string }[]).map((m) => ({
        sender_role: m.author_id === row.user_id ? "client" : "coordinator",
        body: m.body,
        created_at: m.created_at,
      })),
    });
  }

  const historyMatch = path.match(/^\/api\/portal\/projects\/([^/]+)\/history$/);
  if (historyMatch) {
    const projectId = decodeURIComponent(historyMatch[1]!);
    const { data } = await ctx.admin
      .from("audit_log")
      .select("id, action, metadata, created_at")
      .eq("entity_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    return jsonResponse(
      ((data ?? []) as { id: string; action: string; metadata: Record<string, unknown> | null; created_at: string }[]).map((ev) => ({
        id: ev.id,
        project_id: projectId,
        project_code: null,
        kind: "progress",
        text: `${ev.action.replace(/_/g, " ")}${ev.metadata ? "" : ""}`,
        actor_label: "Portal",
        created_at: ev.created_at,
      })),
    );
  }

  if (path === "/api/portal/workspace-logins") {
    const { data } = await ctx.admin.from("workspace_logins").select("login, active_project_doer_id, allocated_at").order("login");
    return jsonResponse(
      ((data ?? []) as { login: string; active_project_doer_id: string | null; allocated_at: string | null }[]).map((w) => ({
        login: w.login,
        in_use: w.active_project_doer_id ? { project_id: "", project_code: "", doer_code: w.active_project_doer_id, since: w.allocated_at } : null,
      })),
    );
  }

  if (path === "/api/portal/refunds") {
    const { data } = await ctx.admin.from("refund_requests").select("*").order("approved_at", { ascending: false });
    return jsonResponse(data ?? []);
  }

  if (path === "/api/portal/ledger") {
    if (ctx.segment !== "qqd") return jsonResponse({ message: "Only QQD reads the ledger." }, 403);
    const { data } = await ctx.admin.from("ledger_entries").select("*").order("created_at", { ascending: false }).limit(200);
    return jsonResponse(data ?? []);
  }

  if (path === "/api/portal/activity") {
    const { data } = await ctx.admin.from("audit_log").select("id, entity_id, action, created_at").order("created_at", { ascending: false }).limit(60);
    return jsonResponse(
      ((data ?? []) as { id: string; entity_id: string | null; action: string; created_at: string }[]).map((a) => ({
        id: a.id,
        project_id: a.entity_id,
        project_code: null,
        kind: "progress",
        text: a.action.replace(/_/g, " "),
        actor_label: "System",
        created_at: a.created_at,
      })),
    );
  }

  if (path === "/api/portal/notifications") {
    const { data } = await ctx.admin
      .from("notifications")
      .select("id, template_type, deep_link, read_at, created_at")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return jsonResponse(
      ((data ?? []) as { id: string; template_type: string; deep_link: string | null; read_at: string | null; created_at: string }[]).map((n) => ({
        id: n.id,
        title: n.template_type.replace(/_/g, " "),
        body: n.template_type,
        href: n.deep_link,
        tone: "info",
        created_at: n.created_at,
        read_at: n.read_at,
      })),
    );
  }

  if (path === "/api/portal/me/preferences") {
    const { data } = await ctx.admin.from("portal_operator_preferences").select("*").eq("operator_id", ctx.user.id).maybeSingle();
    return jsonResponse(
      data ?? {
        notify_in_app: true,
        notify_email: true,
        notify_whatsapp: false,
        notify_push: true,
        quiet_from: null,
        quiet_to: null,
        urgent_breaks_quiet: true,
      },
    );
  }

  const attachmentUrlMatch = path.match(/^\/api\/portal\/attachments\/([^/]+)\/url$/);
  if (attachmentUrlMatch) {
    const attId = decodeURIComponent(attachmentUrlMatch[1]!);
    const { data: att } = await ctx.admin.from("submission_attachments").select("id, project_id, object_path").eq("id", attId).maybeSingle();
    if (!att) return jsonResponse({ message: "Attachment not found." }, 404);
    const row = att as { id: string; project_id: string; object_path: string };
    if (ctx.segment === "supervisor") {
      const { data: owns } = await ctx.admin.from("projects").select("id").eq("id", row.project_id).eq("supervisor_id", ctx.user.id).maybeSingle();
      if (!owns) return jsonResponse({ message: "Attachment not found." }, 404);
    }
    const { data: signed, error: signErr } = await ctx.admin.storage.from("submission-attachments").createSignedUrl(row.object_path, 120, { download: true });
    if (signErr || !signed?.signedUrl) return jsonResponse({ message: "Could not sign attachment URL." }, 500);
    return jsonResponse({ url: signed.signedUrl });
  }

  if (path === "/api/portal/doers") {
    const view = url.searchParams.get("view");
    if (view === "verification") {
      const { data: kycs } = await ctx.admin.from("kyc").select("id, doer_id, status, created_at").order("created_at", { ascending: false });
      return jsonResponse(kycs ?? []);
    }
    const { data } = await ctx.admin
      .from("profiles")
      .select("id, full_name, available, warning_count, suspended_until, review_flagged, created_at")
      .eq("role", "doer")
      .limit(200);
    return jsonResponse(
      ((data ?? []) as Record<string, unknown>[]).map((d) => ({
        id: d.id,
        doer_code: `R-${String(d.id).slice(0, 4).toUpperCase()}`,
        full_name: d.full_name || "Doer",
        fields: [],
        sub_categories: [],
        experience_tier: "intermediate",
        level: 1,
        average_rating: null,
        projects_completed: 0,
        active_project_count: 0,
        availability: d.available ? "available" : "away",
        verification_status: "verified",
        worked_with_me: false,
        on_time_rate: null,
        last_active_at: d.created_at,
        joined_at: d.created_at,
        status: d.suspended_until ? "suspended" : "active",
        warning_count: d.warning_count ?? 0,
        review_flagged: Boolean(d.review_flagged),
      })),
    );
  }

  if (path === "/api/portal/tickets" || path === "/api/portal/training" || path === "/api/portal/rate-reference" || path === "/api/portal/supervisor-applications") {
    return jsonResponse([]);
  }

  return null;
}
