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
 */

import * as db from "../src/demo/db";
import { QC_CHECKLISTS, TDS_THRESHOLD_INR, TDS_RATE_PERCENT, RESERVE_PERCENT_OF_MARGIN, OPEN_POOL_AFTER_FAILED_OFFERS } from "../src/lib/config";
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
  const initialProjects = db.read.projects();
  const quoteTarget = initialProjects.find((p) => p.status === "awaiting_quote");
  assert(quoteTarget !== undefined, `Found project awaiting quote: ${quoteTarget?.code}`);

  if (quoteTarget) {
    const qqdActor = "op-meera"; // Meera Krishnan (QQD)
    const quoteAmount = 45000; // $450.00
    const doerCost = 1800000; // INR 18,000.00
    const durationHours = 48;
    const note = "Includes research and 2 revision rounds.";

    db.sendQuote(
      quoteTarget.id,
      {
        amount: quoteAmount,
        currency: quoteTarget.client.currency,
        delivery_duration_hours: durationHours,
        expected_doer_cost_inr: doerCost,
        note: note,
      },
      qqdActor,
    );

    const quoted = db.read.project(quoteTarget.id);
    assert(quoted.status === "awaiting_payment", "Project status transitioned to awaiting_payment");
    assert(quoted.quote_amount === quoteAmount, "Quote amount correctly recorded");
    assert(quoted.delivery_duration_hours === durationHours, "Delivery duration recorded");
    assert(quoted.quote_expires_at !== null, "Quote expiry timestamp calculated and set");
    assert(quoted.qqd_id === qqdActor, "QQD quoting operator recorded");

    // Client pays quote
    db.simulatePayment(quoted.id);
    const paid = db.read.project(quoted.id);
    assert(paid.status === "in_progress", "Project status transitioned to in_progress upon payment");
    assert(paid.paid_at !== null, "Payment capture timestamp recorded");
  }

  // -------------------------------------------------------------
  // Test 2: Supervisor Assignment
  // -------------------------------------------------------------
  console.log("\n2. Testing Supervisor Assignment Workflow:");
  const unassigned = db.read.projects().find((p) => p.status === "in_progress" && !p.supervisor_id);
  assert(unassigned !== undefined, `Found unassigned paid project: ${unassigned?.code}`);

  if (unassigned) {
    const supervisorId = "op-kabir"; // Kabir Mehra
    db.assignSupervisor(unassigned.id, supervisorId, "op-meera");
    const assigned = db.read.project(unassigned.id);
    assert(assigned.supervisor_id === supervisorId, `Supervisor ${supervisorId} assigned to project`);
    assert(assigned.supervisor_assigned_at !== null, "Supervisor assignment timestamp recorded");

    const kabir = db.read.operators().find((o) => o.id === supervisorId);
    assert((kabir?.active_project_count ?? 0) > 0, "Supervisor active project count updated");
  }

  // -------------------------------------------------------------
  // Test 3: Doer Sourcing & Offer Lifecycle
  // -------------------------------------------------------------
  console.log("\n3. Testing Doer Sourcing & Offer Progression:");
  const sourcingProject = db.read.projects().find((p) => p.supervisor_id === "op-kabir" && p.doers.length === 0);
  assert(sourcingProject !== undefined, `Found project ready for doer sourcing: ${sourcingProject?.code}`);

  if (sourcingProject) {
    const qualifiedDoers = db.read.doers().filter(
      (d) => d.verification_status === "verified" && d.status === "active" && d.fields.includes(sourcingProject.category) && d.active_project_count < 3
    );
    assert(qualifiedDoers.length >= 3, `Found ${qualifiedDoers.length} qualified doers for ${sourcingProject.category}`);

    const doer1 = qualifiedDoers[0]!;
    const doer2 = qualifiedDoers[1]!;
    const doer3 = qualifiedDoers[2]!;

    // 3a. Direct Offer 1 -> Decline
    db.sendOffer(
      sourcingProject.id,
      { doer_id: doer1.id, discipline: sourcingProject.category, payout_amount_inr: 800000, scope_note: "Initial scope", required_module_id: null, as_additional_part: false },
      "op-kabir",
    );
    let pState = db.read.project(sourcingProject.id);
    const pd1 = pState.doers.find((d) => d.doer_id === doer1.id);
    assert(pd1 !== undefined && pd1.status === "offered", `Offer 1 sent to ${doer1.doer_code}`);

    if (pd1) {
      db.simulateOfferResponse(pd1.id, false);
      pState = db.read.project(sourcingProject.id);
      assert(pState.failed_offer_count === 1, "Failed offer count incremented to 1 after decline");
      assert(!pState.in_open_pool, "Open pool remains locked after 1 failed offer");
    }

    // 3b. Direct Offer 2 -> Decline (should unlock open pool)
    db.sendOffer(
      sourcingProject.id,
      { doer_id: doer2.id, discipline: sourcingProject.category, payout_amount_inr: 800000, scope_note: "Initial scope", required_module_id: null, as_additional_part: false },
      "op-kabir",
    );
    pState = db.read.project(sourcingProject.id);
    const pd2 = pState.doers.find((d) => d.doer_id === doer2.id);
    if (pd2) {
      db.simulateOfferResponse(pd2.id, false);
      pState = db.read.project(sourcingProject.id);
      assert(pState.failed_offer_count === 2, "Failed offer count incremented to 2");
      assert(pState.failed_offer_count >= OPEN_POOL_AFTER_FAILED_OFFERS, "Open pool threshold reached (>= 2)");
    }

    // 3c. Unlocked: Send 3rd offer and accept
    db.sendOffer(
      sourcingProject.id,
      { doer_id: doer3.id, discipline: sourcingProject.category, payout_amount_inr: 850000, scope_note: "Full scope", required_module_id: null, as_additional_part: false },
      "op-kabir",
    );
    pState = db.read.project(sourcingProject.id);
    const pd3 = pState.doers.find((d) => d.doer_id === doer3.id);
    assert(pd3 !== undefined, "Offer 3 created");
    if (pd3) {
      db.simulateOfferResponse(pd3.id, true);
      pState = db.read.project(sourcingProject.id);
      const activeDoer = pState.doers.find((d) => d.doer_id === doer3.id);
      assert(activeDoer?.status === "accepted", "Doer offer accepted; doer is now active on project");
      assert(activeDoer?.accepted_at !== null, "Doer acceptance timestamp recorded");
    }
  }

  // -------------------------------------------------------------
  // Test 4: Workspace Link Safety & Progress Tracking
  // -------------------------------------------------------------
  console.log("\n4. Testing Workspace Link Safety & Progress Tracking:");
  // URL safety tests
  assert(!checkWorkspaceUrl("http://insecure-site.com").ok, "Insecure HTTP URL correctly rejected");
  assert(!checkWorkspaceUrl("https://admin:pass@figma.com/file/123").ok, "URL with embedded credentials rejected");
  assert(!checkWorkspaceUrl("https://figma.com:8443/file/123").ok, "URL with custom port rejected");
  assert(!checkWorkspaceUrl("https://unapproved-random-domain.xyz/file").ok, "Unapproved domain rejected");
  assert(checkWorkspaceUrl("https://www.figma.com/file/abcdef12345/Design-File").ok, "Approved Figma URL validated successfully");
  assert(checkWorkspaceUrl("https://docs.google.com/document/d/12345/edit").ok, "Approved Google Docs URL validated successfully");

  // Apply working link to active project
  const linkedProject = db.read.projects().find((p) => p.doers.some((d) => d.status === "accepted"));
  assert(linkedProject !== undefined, `Found project with active doer: ${linkedProject?.code}`);
  if (linkedProject) {
    const doer = linkedProject.doers.find((d) => d.status === "accepted")!;
    db.setWorkingLink(doer.id, "https://www.figma.com/file/project-test-123", linkedProject.supervisor_id ?? "op-kabir");
    const updated = db.read.project(linkedProject.id);
    const updatedDoer = updated.doers.find((d) => d.id === doer.id);
    assert(updatedDoer?.working_link === "https://www.figma.com/file/project-test-123", "Workspace link safely attached to doer");

    // Progress updates
    db.updateProgress(linkedProject.id, 65, "First draft complete and reviewed", linkedProject.supervisor_id ?? "op-kabir");
    const withProgress = db.read.project(linkedProject.id);
    assert(withProgress.progress_percent === 65, "Progress percent updated to 65%");
    assert(withProgress.progress_label === "First draft complete and reviewed", "Progress label updated");
    assert(withProgress.progress_updated_at !== null, "Progress timestamp recorded");
  }

  // -------------------------------------------------------------
  // Test 5: Quality Check Gate & Delivery
  // -------------------------------------------------------------
  console.log("\n5. Testing Quality Check Gate & Delivery Enforcement:");
  const qcTarget = db.read.projects().find((p) => p.status === "in_review");
  assert(qcTarget !== undefined, `Found project in review (QC): ${qcTarget?.code}`);

  if (qcTarget) {
    const supervisor = qcTarget.supervisor_id ?? "op-kabir";
    // Attempt delivery with incomplete checks -> must fail
    let blockedAsExpected = false;
    try {
      db.deliver(qcTarget.id, "Here is your work", supervisor);
    } catch (err: any) {
      blockedAsExpected = err.message.includes("check") || err.message.includes("deliverable") || err.message.includes("complete");
    }
    assert(blockedAsExpected, "Delivery gate blocked delivery when QC was incomplete");

    // Complete all checks for category
    const items = QC_CHECKLISTS[qcTarget.category];
    const checks: Record<string, boolean> = {};
    for (const item of items) {
      checks[item.id] = true;
    }
    const custom_checks = (qcTarget.qc?.custom_checks ?? []).map((c) => ({ ...c, done: true }));

    db.saveQc(qcTarget.id, { checks, custom_checks, notes: "Reviewed and approved" }, supervisor);

    // Upload required deliverable
    db.addDeliverable(qcTarget.id, "final_deliverable.pdf", "deliverable", supervisor);

    // If writing, attach originality report
    if (qcTarget.category === "writing") {
      db.addDeliverable(qcTarget.id, "originality_report.pdf", "quality_report", supervisor);
    }

    // Now deliver
    db.deliver(qcTarget.id, "Final delivery complete with documentation.", supervisor);
    const delivered = db.read.project(qcTarget.id);
    assert(delivered.status === "delivered", "Project delivered to client successfully");
    assert(delivered.delivered_at !== null, "Delivery timestamp recorded");
    assert(delivered.delivery_note !== null, "Delivery note attached for client");
  }

  // -------------------------------------------------------------
  // Test 6: Approval, Disbursement & Section 194J TDS
  // -------------------------------------------------------------
  console.log("\n6. Testing Approval, Disbursement & TDS Calculation:");
  // Unit test Section 194J TDS rules
  // Rule A: fyBefore + gross <= 30k INR (3,000,000 paise) -> 0 TDS
  assert(db.computeTds(1_000_000, 500_000) === 0, "TDS is 0 when cumulative FY is below 30,000 INR threshold");
  // Rule B: fyBefore <= 30k but crossing 30k -> 10% on full cumulative amount
  assert(db.computeTds(2_800_000, 500_000) === 330_000, "TDS is 10% on full cumulative amount when crossing 30,000 INR threshold");
  // Rule C: fyBefore already > 30k -> 10% on gross
  assert(db.computeTds(3_500_000, 500_000) === 50_000, "TDS is 10% on gross when FY before already exceeded threshold");

  // Check disbursement queue
  const disbursements = db.read.disbursements();
  assert(disbursements.length > 0, `Disbursement queue has ${disbursements.length} items`);

  const pendingItem = disbursements.find((d) => d.lines.some((l) => l.status === "queued"));
  assert(pendingItem !== undefined, "Found disbursement item with queued payout line");

  if (pendingItem) {
    const queuedLine = pendingItem.lines.find((l) => l.status === "queued")!;
    assert(queuedLine.net_inr === queuedLine.gross_inr - queuedLine.tds_inr, "Net payable equals gross minus TDS");

    // Verify margin reserve
    const expectedReserve = Math.max(0, percentOf(pendingItem.margin_inr, RESERVE_PERCENT_OF_MARGIN));
    assert(pendingItem.reserve_inr === expectedReserve, `Reserve calculated as ${RESERVE_PERCENT_OF_MARGIN}% of margin`);

    // Execute payout
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
    // Support agent responds
    db.replyTicket(openTicket.id, "Thank you for contacting us. We are looking into your request.", "op-arjun", false);
    const answered = db.read.ticket(openTicket.id);
    assert(answered.first_response_at !== null, "First response timestamp recorded on ticket");
    assert(answered.status === "in_progress", "Ticket transitioned to in_progress");

    // Support recommends refund
    db.recommendRefund(
      openTicket.id,
      { kind: "partial", amount: 5000, currency: "USD", note: "Delay caused minor inconvenience" },
      "not_at_fault",
      "op-arjun",
    );
    const recommended = db.read.ticket(openTicket.id);
    assert(recommended.refund_recommendation !== null, "Refund recommendation recorded on ticket");

    // Check refund item in QQD refund queue
    const refunds = db.read.refunds();
    const refundCase = refunds.find((r) => r.ticket_reference === openTicket.reference);
    assert(refundCase !== undefined, `Refund case queued for QQD execution: ${refundCase?.ticket_reference}`);

    if (refundCase) {
      db.executeRefund(refundCase.id, "op-meera");
      const executed = db.read.refunds().find((r) => r.id === refundCase.id);
      assert(executed?.status === "executed", "Refund status updated to executed");
      assert(executed?.executed_at !== null, "Refund execution timestamp recorded");
      assert(executed?.executed_by === "Meera Krishnan", "Executing QQD operator recorded");
    }
  }

  // -------------------------------------------------------------
  // Test 8: Doer Onboarding & Verification Call
  // -------------------------------------------------------------
  console.log("\n8. Testing Doer Onboarding & Level 1 Verification:");
  const vCase = db.read.verification().find((v) => v.stage === "document_check");
  assert(vCase !== undefined, `Found verification case in document check: ${vCase?.doer_code}`);

  if (vCase) {
    // Confirm documents first as required by assignOnboarding
    db.recordDocumentCheck(vCase.id, {
      documents: vCase.documents.map((d) => ({ ...d, legible: true, name_matches: true })),
      payout_name_matches: true,
    });
    // QQD assigns supervisor
    db.assignOnboarding(vCase.id, "op-kabir");
    let cState = db.read.verification().find((v) => v.id === vCase.id)!;
    assert(cState.stage === "supervisor_call", "Case moved to supervisor_call stage");
    assert(cState.assigned_supervisor_id === "op-kabir", "Supervisor assigned for identity call");

    // Supervisor verifies doer
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

  console.log(`\n=================================================`);
  console.log(`QA Phase 2 Summary: ${passed} passed, ${failed} failed`);
  console.log(`=================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Unhandled error during QA Phase 2:", err);
  process.exit(1);
});
