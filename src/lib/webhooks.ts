import type { Project } from "@/types/domain";

/**
 * Webhook Ingestion & Idempotency Engine (PRD BR-010, BR-011, AC-09, AC-10).
 *
 * Enforces:
 * 1. Cryptographic signature verification using HMAC-SHA256 (AC-09).
 * 2. Event idempotency: repeated event deliveries return HTTP 200 with no double-action.
 * 3. Double-payment rejection (AC-10): second payment attempts return HTTP 409 Conflict.
 * 4. State advancement: transitioning 'awaiting_payment' projects to 'in_progress' and
 *    initiating the 15-minute QQD supervisor assignment queue.
 */

export interface WebhookEvent {
  id: string;
  provider: "razorpay" | "stripe";
  event: string;
  created_at: string;
  data: {
    project_id: string;
    order_id?: string;
    payment_id?: string;
    amount_inr?: number;
    currency?: string;
  };
}

export interface WebhookResult {
  statusCode: 200 | 400 | 404 | 409 | 500;
  message: string;
  projectId?: string;
  advanced?: boolean;
}

// In-memory set of processed provider event IDs for idempotency deduplication.
const processedEvents = new Set<string>();

/**
 * Verify HMAC-SHA256 signature using the standard Web Crypto API.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret || !payload) return false;
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Ingest and process a payment webhook with idempotency and state safety checks.
 */
export async function processPaymentWebhook(
  event: WebhookEvent,
  signature: string,
  secret: string,
  rawPayload: string,
  findProject: (id: string) => Project | undefined,
  advanceProject: (id: string, paymentInfo: { paymentId: string; paidAt: string }) => void,
): Promise<WebhookResult> {
  // AC-09: Forged or unsigned webhooks are rejected with 400
  const isValid = await verifyWebhookSignature(rawPayload, signature, secret);
  if (!isValid) {
    return {
      statusCode: 400,
      message: "Webhook rejected: invalid cryptographic signature.",
    };
  }

  // BR-011: Idempotency deduplication
  if (processedEvents.has(event.id)) {
    return {
      statusCode: 200,
      message: "Event already processed. Idempotent response.",
      projectId: event.data.project_id,
      advanced: false,
    };
  }

  // Validate event type
  if (event.event !== "payment.captured" && event.event !== "checkout.session.completed") {
    return {
      statusCode: 200,
      message: `Ignored unhandled event type: ${event.event}`,
      projectId: event.data.project_id,
      advanced: false,
    };
  }

  const project = findProject(event.data.project_id);
  if (!project) {
    return {
      statusCode: 404,
      message: `Project ${event.data.project_id} not found.`,
    };
  }

  // AC-10: Double payment rejected with 409
  if (project.status !== "awaiting_payment") {
    return {
      statusCode: 409,
      message: `Double payment rejected: project is already in status '${project.status}'.`,
      projectId: project.id,
      advanced: false,
    };
  }

  // Advance project state to in_progress
  processedEvents.add(event.id);
  const now = new Date().toISOString();
  advanceProject(project.id, {
    paymentId: event.data.payment_id ?? event.id,
    paidAt: now,
  });

  return {
    statusCode: 200,
    message: "Payment captured successfully. Project advanced to in_progress.",
    projectId: project.id,
    advanced: true,
  };
}
