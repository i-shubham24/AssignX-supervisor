/**
 * QA Phase 2: End-to-End Workflow Tests.
 *
 * Runs full lifecycle simulations through the backend API and domain logic:
 * 1. Quote Lifecycle: draft -> price guide -> quote sent -> payment -> assignment
 * 2. Supervisor Assignment: load balancing, category checks, assignment
 * 3. Doer Sourcing: direct offers -> expiry / decline -> open pool unlocking -> accept
 * 4. Workspace Link & Progress: URL safety check, link setting, progress milestones
 * 5. Quality Check Gate: category checklists, file uploads, delivery gate enforcement
 * 6. Payout & Disbursement: Section 194J TDS calculation (30k threshold), margin reserve, payout execution
 * 7. Support & Refunds: ticket lifecycle, refund recommendation, QQD execution, ledger audit
 * 8. Doer Onboarding: document inspection, supervisor identity call, Level 1 verification
 * 9. Moderation: held message screening, approve / remove decisions
 * 10. Brief Redaction & PII Guard
 * 11. QC Originality & AI Score Persistence
 * 12. Post-Completion Doer Rating & QQD Conduct Actions
 * 13. Paid 4th+ Client Revision Flow
 * 14. Pre-Doer Refund Fee Math & Chargeback Evidence Bundle
 */

import * as db from "../src/demo/db";
import { QC_CHECKLISTS, RESERVE_PERCENT_OF_MARGIN, OPEN_POOL_AFTER_FAILED_OFFERS, FREE_REVISIONS } from "../src/lib/config";
import { detectBriefPii } from "../src/lib/input-safety";
import { checkWorkspaceUrl } from "../src/lib/safe-url";
import { percentOf } from "../src/lib/money";

console.log("=================================================");
console.log("QA PHASE 2: END-TO-END WORKFLOW TESTS");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  // -------------------------------------------------------------
  // Test 1: Quote Lifecycle
  // -------------------------------------------------------------
  console.log("\n1. Testing Quote Lifecycle Workflow:");
  const initialProjects = db.read.projects("op-meera");
  const quoteTarget = initialProjects.find((p) => p.status === "awaiting_quote");
  assert(quoteTarget !== undefined, `Found project awaiting quote: ${quoteTarget?.code}`);

  if (quoteTarget) {
    const qqdActor = "op-meera";
    const quoteAmount = 45000;
    const doerCost = 1800000;
    const durationHours = 48;
    const note = "Includes research and 2 revision rounds.";

    db.sendQuote(
      quoteTarget.id,
      {
        amount: quoteAmount,
        currency: quoteTarget.client.currency,
        delivery_duration_hours: durationHours,
        expected_doer_cost_inr: doerCost,
        note,
      },
      qqdActor,
    );

    const quoted = db.read.project(quoteTarget.id, qqdActor);
    assert(quoted.status === "awaiting_payment", "Project status transitioned to awaiting_payment");
    assert(quoted.quote_amount === quoteAmount, "Quote amount correctly recorded");
    assert(quoted.delivery_duration_hours === durationHours, "Delivery duration recorded");
    assert(quoted.quote_expires_at !== null, "Quote expiry timestamp calculated and set");
    assert(quoted.qqd_id === qqdActor, "QQD quoting operator recorded");

    db.simulatePayment(quoted.id);
    const paid = db.read.project(quoted.id, qqdActor);
    assert(paid.status === "in_progress", "Project status transitioned to in_progress upon payment");
    assert(paid.paid_at !== null, "Payment capture timestamp recorded");
    assert(Boolean(paid.invoice_number), "Invoice number recorded on capture");
  }

  // -------------------------------------------------------------
  // Test 2: Supervisor Assignment
  // -------------------------------------------------------------
  console.log("\n2. Testing Supervisor Assignment Workflow:");
  const unassigned = db.read.projects("op-meera").find((p) => p.status === "in_progress" && !p.supervisor_id);
  assert(unassigned !== undefined, `Found unassigned paid project: ${unassigned?.code}`);

  if (unassigned) {
    const supervisorId = "op-kabir";
    db.assignSupervisor(unassigned.id, supervisorId, "op-meera");
    const assigned = db.read.project(unassigned.id, supervisorId);
    assert(assigned.supervisor_id === supervisorId, `Supervisor ${supervisorId} assigned to project`);
    assert(assigned.supervisor_assigned_at !== null, "Supervisor assignment timestamp recorded");

    const kabir = db.read.operators().find((o) => o.id === supervisorId);
    assert((kabir?.active_project_count ?? 0) > 0, "Supervisor active project count updated");
  }

  // -------------------------------------------------------------
  // Test 3: Doer Sourcing & Offer Lifecycle
  // -------------------------------------------------------------
  console.log("\n3. Testing Doer Sourcing & Offer Progression:");
  const sourcingProject = db.read.projects("op-kabir").find((p) => p.supervisor_id === "op-kabir" && p.doers.length === 0);
  assert(sourcingProject !== undefined, `Found project ready for doer sourcing: ${sourcingProject?.code}`);

  if (sourcingProject) {
    const qualifiedDoers = db.read.doers().filter(
      (d) => d.verification_status === "verified" && d.status === "active" && d.fields.includes(sourcingProject.category) && d.active_project_count < 3,
    );
    assert(qualifiedDoers.length >= 3, `Found ${qualifiedDoers.length} qualified doers for ${sourcingProject.category}`);

    const doer1 = qualifiedDoers[0]!;
    const doer2 = qualifiedDoers[1]!;
    const doer3 = qualifiedDoers[2]!;

    db.sendOffer(
      sourcingProject.id,
      { doer_id: doer1.id, discipline: sourcingProject.category, payout_amount_inr: 800000, scope_note: "Initial scope", required_module_id: null, as_additional_part: false },
      "op-kabir",
    );
    let pState = db.read.project(sourcingProject.id, "op-kabir");
    const pd1 = pState.doers.find((d) => d.doer_id === doer1.id);
    assert(pd1 !== undefined && pd1.status === "offered", `Offer 1 sent to ${doer1.doer_code}`);

    if (pd1) {
      db.simulateOfferResponse(pd1.id, false);
      pState = db.read.project(sourcingProject.id, "op-kabir");
      assert(pState.failed_offer_count === 1, "Failed offer count incremented to 1 after decline");
      assert(!pState.in_open_pool, "Open pool remains locked after 1 failed offer");
    }

    db.sendOffer(
      sourcingProject.id,
      { doer_id: doer2.id, discipline: sourcingProject.category, payout_amount_inr: 800000, scope_note: "Initial scope", required_module_id: null, as_additional_part: false },
      "op-kabir",
    );
    pState = db.read.project(sourcingProject.id, "op-kabir");
    const pd2 = pState.doers.find((d) => d.doer_id === doer2.id);
    if (pd2) {
      db.simulateOfferResponse(pd2.id, false);
      pState = db.read.project(sourcingProject.id, "op-kabir");
      assert(pState.failed_offer_count === 2, "Failed offer count incremented to 2");
      assert(pState.failed_offer_count >= OPEN_POOL_AFTER_FAILED_OFFERS, "Open pool threshold reached (>= 2)");
    }

    db.sendOffer(
      sourcingProject.id,
      { doer_id: doer3.id, discipline: sourcingProject.category, payout_amount_inr: 850000, scope_note: "Full scope", required_module_id: null, as_additional_part: false },
      "op-kabir",
    );
    pState = db.read.project(sourcingProject.id, "op-kabir");
    const pd3 = pState.doers.find((d) => d.doer_id === doer3.id);
    assert(pd3 !== undefined, "Offer 3 created");
    if (pd3) {
      db.simulateOfferResponse(pd3.id, true);
      pState = db.read.project(sourcingProject.id, "op-kabir");
      const activeDoer = pState.doers.find((d) => d.doer_id === doer3.id);
      assert(activeDoer?.status === "accepted", "Doer offer accepted; doer is now active on project");
      assert(activeDoer?.accepted_at !== null, "Doer acceptance timestamp recorded");
    }
  }

  // -------------------------------------------------------------
  // Test 4: Workspace Link Safety & Progress Tracking
  // -------------------------------------------------------------
  console.log("\n4. Testing Workspace Link Safety & Progress Tracking:");
  assert(!checkWorkspaceUrl("http://insecure-site.com").ok, "Insecure HTTP URL correctly rejected");
  assert(!checkWorkspaceUrl("https://admin:pass@figma.com/file/123").ok, "URL with embedded credentials rejected");
  assert(!checkWorkspaceUrl("https://figma.com:8443/file/123").ok, "URL with custom port rejected");
  assert(!checkWorkspaceUrl("https://unapproved-random-domain.xyz/file").ok, "Unapproved domain rejected");
  assert(checkWorkspaceUrl("https://www.figma.com/file/abcdef12345/Design-File").ok, "Approved Figma URL validated successfully");
  assert(checkWorkspaceUrl("https://docs.google.com/document/d/12345/edit").ok, "Approved Google Docs URL validated successfully");

  const linkedProject = db.read.projects("op-meera").find((p) => p.doers.some((d) => d.status === "accepted") && p.supervisor_id === "op-kabir");
  assert(linkedProject !== undefined, `Found project with active doer: ${linkedProject?.code}`);
  if (linkedProject) {
    const doer = linkedProject.doers.find((d) => d.status === "accepted")!;
    db.setWorkingLink(doer.id, "https://www.figma.com/file/project-test-123", "op-kabir");
    const updated = db.read.project(linkedProject.id, "op-kabir");
    const updatedDoer = updated.doers.find((d) => d.id === doer.id);
    assert(updatedDoer?.working_link === "https://www.figma.com/file/project-test-123", "Workspace link safely attached to doer");

    db.updateProgress(linkedProject.id, 65, "First draft complete and reviewed", "op-kabir");
    const withProgress = db.read.project(linkedProject.id, "op-kabir");
    assert(withProgress.progress_percent === 65, "Progress percent updated to 65%");
    assert(withProgress.progress_label === "First draft complete and reviewed", "Progress label updated");
    assert(withProgress.progress_updated_at !== null, "Progress timestamp recorded");
  }

  // -------------------------------------------------------------
  // Test 5 & 11: Quality Check Gate, Delivery & QC Scores
  // -------------------------------------------------------------
  console.log("\n5. Testing Quality Check Gate & Score Persistence:");
  const qcTarget = db.read.projects("op-kabir").find((p) => p.status === "in_review");
  assert(qcTarget !== undefined, `Found project in review (QC): ${qcTarget?.code}`);

  if (qcTarget) {
    const supervisor = qcTarget.supervisor_id ?? "op-kabir";
    let blockedAsExpected = false;
    try {
      db.deliver(qcTarget.id, "Here is your work", supervisor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      blockedAsExpected = msg.includes("check") || msg.includes("deliverable") || msg.includes("complete");
    }
    assert(blockedAsExpected, "Delivery gate blocked delivery when QC was incomplete");

    const items = QC_CHECKLISTS[qcTarget.category];
    const checks: Record<string, boolean> = {};
    for (const item of items) checks[item.id] = true;
    const custom_checks = (qcTarget.qc?.custom_checks ?? []).map((c) => ({ ...c, done: true }));

    db.saveQc(qcTarget.id, { checks, custom_checks, notes: "Reviewed and approved", originality_pct: 98, ai_score_pct: 2 }, supervisor);
    const savedQc = db.read.project(qcTarget.id, supervisor).qc;
    assert(savedQc?.originality_pct === 98 && savedQc?.ai_score_pct === 2, "Originality and AI percentages persisted on QcRecord");

    db.addDeliverable(qcTarget.id, "final_deliverable.pdf", "deliverable", supervisor);
    if (qcTarget.category === "writing") {
      db.addDeliverable(qcTarget.id, "originality_report.pdf", "quality_report", supervisor);
    }

    db.deliver(qcTarget.id, "Final delivery complete with documentation.", supervisor);
    const delivered = db.read.project(qcTarget.id, supervisor);
    assert(delivered.status === "delivered", "Project delivered to client successfully");
    assert(delivered.delivered_at !== null, "Delivery timestamp recorded");
    assert(delivered.delivery_note !== null, "Delivery note attached for client");
  }

  // -------------------------------------------------------------
  // Test 6: Approval, Disbursement & Section 194J TDS
  // -------------------------------------------------------------
  console.log("\n6. Testing Approval, Disbursement & TDS Calculation:");
  assert(db.computeTds(1_000_000, 500_000) === 0, "TDS is 0 when cumulative FY is below 30,000 INR threshold");
  assert(db.computeTds(2_800_000, 500_000) === 330_000, "TDS is 10% on full cumulative amount when crossing 30,000 INR threshold");
  assert(db.computeTds(3_500_000, 500_000) === 50_000, "TDS is 10% on gross when FY before already exceeded threshold");

  const disbursements = db.read.disbursements();
  assert(disbursements.length > 0, `Disbursement queue has ${disbursements.length} items`);

  const pendingItem = disbursements.find((d) => d.lines.some((l) => l.status === "queued"));
  assert(pendingItem !== undefined, "Found disbursement item with queued payout line");

  if (pendingItem) {
    const queuedLine = pendingItem.lines.find((l) => l.status === "queued")!;
    assert(queuedLine.net_inr === queuedLine.gross_inr - queuedLine.tds_inr, "Net payable equals gross minus TDS");

    const expectedReserve = Math.max(0, percentOf(pendingItem.margin_inr, RESERVE_PERCENT_OF_MARGIN));
    assert(pendingItem.reserve_inr === expectedReserve, `Reserve calculated as ${RESERVE_PERCENT_OF_MARGIN}% of margin`);

    db.executePayout(queuedLine.project_doer_id, "op-meera");
    const updatedLine = db.read.disbursements().flatMap((d) => d.lines).find((l) => l.project_doer_id === queuedLine.project_doer_id);
    assert(updatedLine?.status === "paid", "Disbursement line status updated to paid");
    assert(updatedLine?.provider_ref !== null, "Provider reference ID assigned to payment transaction");
    assert(updatedLine?.executed_by === "Meera Krishnan", "Executing operator recorded");
  }

  // -------------------------------------------------------------
  // Test 7: Support Ticket & Refund Workflow
  // -------------------------------------------------------------
  console.log("\n7. Testing Support Ticket & Refund Recommendation Workflow:");
  const openTicket = db.read.tickets().find((t) => t.status === "new" && t.project_code);
  assert(openTicket !== undefined, `Found open support ticket: ${openTicket?.reference}`);

  if (openTicket) {
    db.replyTicket(openTicket.id, "Thank you for contacting us. We are looking into your request.", "op-devika", false);
    const answered = db.read.ticket(openTicket.id);
    assert(answered.first_response_at !== null, "First response timestamp recorded on ticket");
    assert(answered.status === "in_progress", "Ticket transitioned to in_progress");

    db.recommendRefund(
      openTicket.id,
      { kind: "partial", amount: 5000, currency: "USD", note: "Delay caused minor inconvenience and missed schedule." },
      "op-devika",
    );
    const recommended = db.read.ticket(openTicket.id);
    assert(recommended.refund_recommendation !== null, "Refund recommendation recorded on ticket");

    const refunds = db.read.refunds();
    const refundCase = refunds.find((r) => r.ticket_reference === openTicket.reference);
    assert(refundCase !== undefined, `Refund case queued for QQD execution: ${refundCase?.ticket_reference}`);

    if (refundCase && refundCase.project.id !== "unknown") {
      const targetProj = db.read.project(refundCase.project.id, "op-meera");
      db.decideLiability(refundCase.id, "not_at_fault", "Work was satisfactory and within agreed scope.", null, targetProj.supervisor_id ?? "op-kabir");
      db.executeRefund(refundCase.id, "op-meera");
      const executed = db.read.refunds().find((r) => r.id === refundCase.id);
      assert(executed?.status === "executed", "Refund status updated to executed");
      assert(executed?.executed_at !== null, "Refund execution timestamp recorded");
    } else if (refundCase) {
      let needsFaultFirst = false;
      try {
        db.executeRefund(refundCase.id, "op-meera");
      } catch {
        needsFaultFirst = true;
      }
      assert(needsFaultFirst, "Refund blocked until supervisor fault decision exists");
    }
  }

  // -------------------------------------------------------------
  // Test 8: Doer Onboarding & Verification Call
  // -------------------------------------------------------------
  console.log("\n8. Testing Doer Onboarding & Level 1 Verification:");
  const vCase = db.read.verification().find((v) => v.stage === "document_check");
  assert(vCase !== undefined, `Found verification case in document check: ${vCase?.doer_code}`);

  if (vCase) {
    db.recordDocumentCheck(
      vCase.id,
      {
        documents: vCase.documents.map((d) => ({ ...d, legible: true, name_matches: true })),
        payout_name_matches: true,
      },
      "op-meera",
    );
    db.assignOnboarding(vCase.id, "op-kabir", "op-meera");
    let cState = db.read.verification().find((v) => v.id === vCase.id)!;
    assert(cState.stage === "supervisor_call", "Case moved to supervisor_call stage");
    assert(cState.assigned_supervisor_id === "op-kabir", "Supervisor assigned for identity call");

    db.decideVerification(vCase.id, true, "", "op-kabir");
    cState = db.read.verification().find((v) => v.id === vCase.id)!;
    assert(cState.stage === "verified", "Doer verification case completed as verified");

    const doer = db.read.doer(vCase.doer_id);
    assert(doer.verification_status === "verified", "Doer pool record marked as verified");
    assert(doer.level === 1, "Doer initialized at Level 1");
  }

  // -------------------------------------------------------------
  // Test 9: Safety Moderation Queue (held items)
  // -------------------------------------------------------------
  console.log("\n9. Testing Message Moderation Boundary:");
  const heldItems = db.read.held();
  assert(heldItems.length > 0, `Held moderation queue populated with ${heldItems.length} items`);

  if (heldItems.length > 0) {
    const itemToApprove = heldItems[0]!;
    db.moderate(itemToApprove.message.id, "approve", "op-meera");
    const msgs = db.read.messages(itemToApprove.message.project_id, itemToApprove.message.channel);
    const approvedMsg = msgs.find((m) => m.id === itemToApprove.message.id);
    assert(approvedMsg?.state === "approved", "Approved message state updated to approved");
    assert(approvedMsg?.moderated_by === "op-meera", "Moderating operator recorded");

    if (heldItems.length > 1) {
      const itemToRemove = heldItems[1]!;
      db.moderate(itemToRemove.message.id, "remove", "op-meera");
      const msgsAfter = db.read.messages(itemToRemove.message.project_id, itemToRemove.message.channel);
      const removedMsg = msgsAfter.find((m) => m.id === itemToRemove.message.id);
      assert(removedMsg?.state === "removed", "Removed message state updated to removed");
    }
  }

  // -------------------------------------------------------------
  // Test 10: Brief Redaction & PII Detection
  // -------------------------------------------------------------
  console.log("\n10. Testing Brief Redaction & PII Guard:");
  const piiFlags = detectBriefPii("Contact Priya Nambiar on +91 98200 11223 or priya@example.com", "Priya Nambiar");
  assert(piiFlags.includes("email address") && piiFlags.includes("phone number") && piiFlags.includes("client name"), "PII detector catches email, phone, and client name");
  const packProj = db.read.project("p-1270", "op-kabir");
  const briefFileId = packProj.attachments.find((a) => a.kind === "brief")?.id;
  db.updateDoerBrief(
    "p-1270",
    { doer_brief: "Wrapper design for 3 SKUs using attached dieline specifications.", attachment_visibility: briefFileId ? { [briefFileId]: false } : {} },
    "op-kabir",
  );
  const redactedProj = db.read.project("p-1270", "op-kabir");
  assert(Boolean(redactedProj.doer_brief), "Redacted doer brief saved on project");
  assert(briefFileId ? redactedProj.attachments.find((a) => a.id === briefFileId)?.doer_visible === false : true, "Brief file visibility toggle persisted");

  // -------------------------------------------------------------
  // Test 12: Post-Completion Doer Rating & Conduct Enforcement
  // -------------------------------------------------------------
  console.log("\n11. Testing Doer Rating & Conduct Enforcement:");
  const comp = db.read.project("p-1228", "op-kabir");
  const compDoer = comp.doers[0];
  assert(compDoer !== undefined, "Completed project assignment found for rating");
  if (compDoer) {
    db.rateDoer("p-1228", { project_doer_id: compDoer.id, quality: 5, timeliness: 5, communication: 5, notes: "Delivered crisp vector files." }, "op-kabir");
    const rated = db.read.project("p-1228", "op-kabir");
    assert((rated.doer_ratings?.length ?? 0) === 1, "Supervisor post-completion doer rating recorded");
  }
  db.conductDoerAction("d-1011", { action: "warning", reason: "Missed 48 hour snapshot update twice on active project." }, "op-meera");
  const warnedDoer = db.read.doer("d-1011");
  assert((warnedDoer.warning_count ?? 0) >= 1, "QQD conduct warning recorded on doer profile");
  db.conductDoerAction("d-1011", { action: "review_cleared", reason: "Reviewed recent work with supervisor." }, "op-meera");
  assert(db.read.doer("d-1011").review_flagged === false, "QQD cleared review flag");

  // -------------------------------------------------------------
  // Test 13: Paid 4th+ Client Revision Flow
  // -------------------------------------------------------------
  console.log("\n12. Testing Paid 4th+ Client Revision Quoting Flow:");
  const revTarget = db.read.project("p-1231", "op-kabir");
  for (let i = 1; i <= FREE_REVISIONS; i++) {
    db.simulateClientRevision(revTarget.id, `Free revision round ${i}`);
    const sup = revTarget.supervisor_id ?? "op-kabir";
    db.simulateDoerSubmit(revTarget.id);
    const items = QC_CHECKLISTS[revTarget.category];
    const checks = Object.fromEntries(items.map((item) => [item.id, true]));
    db.saveQc(revTarget.id, { checks, custom_checks: [], notes: "QC passed" }, sup);
    db.addDeliverable(revTarget.id, `rev-${i}.pdf`, "deliverable", sup);
    db.deliver(revTarget.id, `Delivered revision ${i}`, sup);
  }
  db.requestPaidRevision(revTarget.id, "4th round technical restructure requested.");
  assert(db.read.project(revTarget.id, "op-meera").paid_revision_pending === true, "Paid 4th+ revision marked pending");
  db.sendPaidRevisionQuote(
    revTarget.id,
    { amount: 250_00, currency: "CAD", delivery_duration_hours: 24, expected_doer_cost_inr: 6000_00, note: "Add-on 4th revision round." },
    "op-meera",
  );
  assert(db.read.project(revTarget.id, "op-meera").status === "awaiting_payment", "Paid revision quote awaits payment");
  db.simulatePayment(revTarget.id);
  const afterPaidRev = db.read.project(revTarget.id, "op-meera");
  assert(afterPaidRev.status === "in_progress" && afterPaidRev.revision_count === 4 && !afterPaidRev.paid_revision_pending, "Paid revision funded and reopened as revision #4");

  // -------------------------------------------------------------
  // Test 14: Pre-Doer Refund Fee Math & Chargeback Evidence Pack
  // -------------------------------------------------------------
  console.log("\n13. Testing Pre-Doer Refund Fee Deduction & Chargeback Evidence Pack:");
  const evidence = db.buildChargebackEvidence("p-1228", "op-meera");
  assert(evidence.project_code === "AX-001228" && Boolean(evidence.invoice_number) && evidence.brief.length > 0, "Chargeback evidence pack includes invoice, brief, and project metadata");

  const esc = db.escalateToSupport(
    "p-1270",
    { category: "refund_request", priority: "high", subject: "Client cancelled before doer assignment", body: "Client requested cancellation before any doer accepted." },
    "op-kabir",
  );
  db.recommendRefund(esc.id, { kind: "full", amount: 16_500_00, currency: "INR", note: "Pre-doer cancellation refund minus payment gateway fee." }, "op-devika");
  const preDoerRefund = db.read.refunds().find((r) => r.ticket_reference === esc.reference);
  assert(Boolean(preDoerRefund && (preDoerRefund.gateway_fee_inr ?? 0) > 0), "Pre-doer refund recommendation computes gateway fee deduction");

  console.log(`\n=================================================`);
  console.log(`QA Phase 2 Summary: ${passed} passed, ${failed} failed`);
  console.log(`=================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Unhandled error during QA Phase 2:", err);
  process.exit(1);
});
