import { createHmac } from "node:crypto";
import { processPaymentWebhook, verifyWebhookSignature } from "../src/lib/webhooks.ts";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("Running QA Phase 4: Webhooks & Idempotency Suite (AC-09, AC-10, BR-010, BR-011)...");

  const secret = "test_webhook_secret_key_123";
  const rawPayload = JSON.stringify({
    id: "evt_test_001",
    provider: "razorpay",
    event: "payment.captured",
    created_at: new Date().toISOString(),
    data: { project_id: "p-test-01", payment_id: "pay_123456", amount_inr: 500000 },
  });

  const validSig = createHmac("sha256", secret).update(rawPayload).digest("hex");
  const invalidSig = "bad_signature_deadbeef";

  // Test 1: Signature Verification (AC-09)
  const isSigValid = await verifyWebhookSignature(rawPayload, validSig, secret);
  assert(isSigValid === true, "Valid HMAC-SHA256 signature must be verified as true");

  const isSigRejected = await verifyWebhookSignature(rawPayload, invalidSig, secret);
  assert(isSigRejected === false, "Forged signature must be rejected as false");

  // Mock projects store
  const mockProjects = {
    "p-test-01": { id: "p-test-01", status: "awaiting_payment" },
    "p-test-02": { id: "p-test-02", status: "in_progress" },
  };

  const findProject = (id) => mockProjects[id];
  let advancedCalled = false;
  const advanceProject = (id, info) => {
    advancedCalled = true;
    mockProjects[id].status = "in_progress";
    mockProjects[id].paid_at = info.paidAt;
  };

  const parsedEvent = JSON.parse(rawPayload);

  // Test 2: Forged Webhook rejected with 400 (AC-09)
  const resultForged = await processPaymentWebhook(
    parsedEvent,
    invalidSig,
    secret,
    rawPayload,
    findProject,
    advanceProject,
  );
  assert(resultForged.statusCode === 400, "Forged signature must return HTTP 400");
  assert(advancedCalled === false, "Forged signature must not advance project state");

  // Test 3: Valid Webhook advances awaiting_payment to in_progress (AC-09)
  const resultValid = await processPaymentWebhook(
    parsedEvent,
    validSig,
    secret,
    rawPayload,
    findProject,
    advanceProject,
  );
  assert(resultValid.statusCode === 200, "Valid payment webhook must return HTTP 200");
  assert(resultValid.advanced === true, "Project must advance state on valid webhook");
  assert(mockProjects["p-test-01"].status === "in_progress", "Project status must be in_progress");

  // Test 4: Idempotency deduplication returns 200 without double action (BR-011)
  advancedCalled = false;
  const resultIdempotent = await processPaymentWebhook(
    parsedEvent,
    validSig,
    secret,
    rawPayload,
    findProject,
    advanceProject,
  );
  assert(resultIdempotent.statusCode === 200, "Duplicate event delivery must return HTTP 200");
  assert(resultIdempotent.advanced === false, "Duplicate event must have advanced === false");
  assert(advancedCalled === false, "Duplicate event must not trigger secondary side effects");

  // Test 5: Double Payment Rejected with 409 Conflict (AC-10)
  const rawPayloadDouble = JSON.stringify({
    id: "evt_test_002",
    provider: "razorpay",
    event: "payment.captured",
    created_at: new Date().toISOString(),
    data: { project_id: "p-test-02", payment_id: "pay_999999", amount_inr: 500000 },
  });
  const validSigDouble = createHmac("sha256", secret).update(rawPayloadDouble).digest("hex");
  const parsedDouble = JSON.parse(rawPayloadDouble);

  const resultDouble = await processPaymentWebhook(
    parsedDouble,
    validSigDouble,
    secret,
    rawPayloadDouble,
    findProject,
    advanceProject,
  );
  assert(resultDouble.statusCode === 409, "Double payment on paid project must return HTTP 409 Conflict");
  assert(resultDouble.advanced === false, "Double payment must not advance state");

  // Test 6: Non-existent project returns 404
  const rawPayloadNotFound = JSON.stringify({
    id: "evt_test_003",
    provider: "razorpay",
    event: "payment.captured",
    created_at: new Date().toISOString(),
    data: { project_id: "p-non-existent", payment_id: "pay_000000" },
  });
  const validSigNotFound = createHmac("sha256", secret).update(rawPayloadNotFound).digest("hex");
  const parsedNotFound = JSON.parse(rawPayloadNotFound);

  const resultNotFound = await processPaymentWebhook(
    parsedNotFound,
    validSigNotFound,
    secret,
    rawPayloadNotFound,
    findProject,
    advanceProject,
  );
  assert(resultNotFound.statusCode === 404, "Payment for non-existent project must return HTTP 404");

  console.log(`\nQA Phase 4 Complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
