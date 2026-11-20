/**
 * Demo seed data.
 *
 * Every queue in every segment has something in it, and the timestamps are relative
 * to page load so SLA timers are live: some items are fresh, some near breach, some
 * overdue. Names are fictional. Nothing here is fabricated for a public surface; the
 * portal is internal and this data only exists in demo mode.
 */
import type {
  ActivityEvent,
  Attachment,
  CategorySlug,
  ClientSummary,
  Doer,
  Message,
  Operator,
  PortalNotification,
  Project,
  ProjectDoer,
  RateBand,
  RefundRequest,
  SupervisorApplication,
  LedgerEntry,
  Ticket,
  TrainingModule,
  VerificationCase,
} from "@/types/domain";
import type { Currency } from "@/lib/money";
import { DAY, HOUR, MINUTE } from "@/lib/datetime";

const NOW = Date.now();
export const ago = (ms: number) => new Date(NOW - ms).toISOString();
export const ahead = (ms: number) => new Date(NOW + ms).toISOString();

/* Operators ---------------------------------------------------------- */

export const operators: Operator[] = [
  { id: "op-meera", full_name: "Meera Krishnan", email: "meera.k@assignx.internal", segment: "qqd", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: true, joined_at: ago(400 * DAY) },
  { id: "op-arjun", full_name: "Arjun Rao", email: "arjun.r@assignx.internal", segment: "qqd", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: false, joined_at: ago(210 * DAY) },
  { id: "op-kabir", full_name: "Kabir Malhotra", email: "kabir.m@assignx.internal", segment: "supervisor", categories: ["design", "creative", "marketing"], on_duty: true, active_project_count: 0, average_rating: 4.8, is_lead: false, joined_at: ago(320 * DAY) },
  { id: "op-ananya", full_name: "Ananya Iyer", email: "ananya.i@assignx.internal", segment: "supervisor", categories: ["it", "ai"], on_duty: true, active_project_count: 3, average_rating: 4.7, is_lead: false, joined_at: ago(290 * DAY) },
  { id: "op-rohan", full_name: "Rohan Verma", email: "rohan.v@assignx.internal", segment: "supervisor", categories: ["writing", "research"], on_duty: true, active_project_count: 5, average_rating: 4.6, is_lead: false, joined_at: ago(260 * DAY) },
  { id: "op-sana", full_name: "Sana Qureshi", email: "sana.q@assignx.internal", segment: "supervisor", categories: ["marketing", "writing"], on_duty: false, active_project_count: 2, average_rating: 4.9, is_lead: false, joined_at: ago(150 * DAY) },
  { id: "op-farhan", full_name: "Farhan Siddiqui", email: "farhan.s@assignx.internal", segment: "supervisor", categories: ["design", "it"], on_duty: true, active_project_count: 1, average_rating: 4.5, is_lead: false, joined_at: ago(60 * DAY) },
  { id: "op-devika", full_name: "Devika Nair", email: "devika.n@assignx.internal", segment: "support", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: false, joined_at: ago(230 * DAY) },
  { id: "op-ishita", full_name: "Ishita Bose", email: "ishita.b@assignx.internal", segment: "support", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: false, joined_at: ago(90 * DAY) },
];

/** The operator each demo sign-in lands as. */
export const DEMO_IDENTITY = { qqd: "op-meera", supervisor: "op-kabir", support: "op-devika" } as const;

/* Clients ------------------------------------------------------------ */

const client = (id: string, display_name: string, segment: ClientSummary["segment"], country: string, currency: Currency, projects_count: number): ClientSummary => ({
  id, display_name, segment, country, currency, projects_count,
});

export const clients = {
  lena: client("c-lena", "Lena Hoffmann", "business", "Germany", "EUR", 4),
  marcus: client("c-marcus", "Marcus Bell", "agency", "United Kingdom", "GBP", 11),
  priya: client("c-priya", "Priya Nambiar", "individual", "India", "INR", 2),
  daniel: client("c-daniel", "Daniel Okafor", "business", "Canada", "CAD", 6),
  aisha: client("c-aisha", "Aisha Al Mansoori", "business", "United Arab Emirates", "AED", 3),
  tom: client("c-tom", "Tom Reynolds", "individual", "Australia", "AUD", 1),
  sophie: client("c-sophie", "Sophie Laurent", "agency", "United States", "USD", 14),
  rahul: client("c-rahul", "Rahul Mehta", "business", "India", "INR", 7),
  grace: client("c-grace", "Grace Kim", "individual", "United States", "USD", 2),
  oliver: client("c-oliver", "Oliver Grant", "agency", "United Kingdom", "GBP", 9),
};

/* Doers -------------------------------------------------------------- */

const doer = (
  n: number,
  full_name: string,
  fields: CategorySlug[],
  sub_categories: string[],
  level: 1 | 2 | 3,
  average_rating: number | null,
  projects_completed: number,
  active_project_count: number,
  availability: Doer["availability"],
  worked_with_me: boolean,
  extra: Partial<Doer> = {},
): Doer => ({
  id: `d-${n}`,
  doer_code: `R-${n}`,
  full_name,
  fields,
  sub_categories,
  experience_tier: level === 3 ? "expert" : level === 2 ? "experienced" : "intermediate",
  level,
  average_rating,
  projects_completed,
  active_project_count,
  availability,
  verification_status: "verified",
  worked_with_me,
  on_time_rate: projects_completed > 0 ? Math.min(1, 0.82 + (n % 7) * 0.025) : null,
  last_active_at: ago(((n * 37) % 300) * MINUTE),
  joined_at: ago((40 + n * 3) * DAY),
  status: "active",
  ...extra,
});

export const doers: Doer[] = [
  doer(1001, "Aarav Shah", ["design"], ["Brand identity", "Logos", "Print"], 3, 4.9, 46, 1, "busy", true),
  doer(1002, "Nisha Pillai", ["design", "creative"], ["Illustration", "Social media assets"], 2, 4.6, 17, 0, "available", true),
  doer(1003, "Vikram Joshi", ["design"], ["UI and UX design", "Web"], 3, 4.8, 38, 1, "available", true),
  doer(1004, "Fatima Sheikh", ["design"], ["Print", "Packaging", "Menus"], 2, 4.7, 21, 1, "busy", true),
  doer(1005, "Kunal Desai", ["design"], ["Packaging", "3D mockups"], 2, 4.4, 12, 0, "available", false),
  doer(1006, "Meghna Rao", ["design", "marketing"], ["Presentations", "Pitch decks"], 1, 4.2, 4, 0, "available", false),
  doer(1007, "Rhea Kapoor", ["marketing", "design"], ["Social media management", "Content calendars"], 2, 4.5, 15, 1, "available", true),
  doer(1008, "Siddharth Menon", ["creative"], ["Podcast editing", "Audio production"], 2, 4.3, 19, 2, "busy", false),
  doer(1009, "Tanvi Kulkarni", ["marketing", "writing"], ["Email marketing", "Copywriting"], 3, 4.9, 52, 1, "busy", true),
  doer(1010, "Aditya Bhatt", ["creative"], ["Video editing", "Motion graphics"], 3, 4.8, 33, 0, "available", true),
  doer(1011, "Zoya Khan", ["creative", "design"], ["Thumbnails", "Photo retouching"], 1, 3.9, 6, 1, "available", true),
  doer(1012, "Harsh Agarwal", ["writing"], ["Copywriting", "Ghostwriting", "Web copy"], 2, 4.6, 24, 1, "available", true),
  doer(1013, "Ishaan Gupta", ["it"], ["Web development", "Node.js", "APIs"], 3, 4.9, 41, 1, "busy", false),
  doer(1014, "Pooja Reddy", ["it", "ai"], ["Automation", "Chatbots", "Integrations"], 2, 4.5, 14, 0, "available", false),
  doer(1015, "Arnav Chatterjee", ["creative"], ["Motion graphics", "Explainer animation"], 2, 4.4, 18, 1, "busy", true),
  doer(1016, "Kavya Iyer", ["research", "writing"], ["Market research", "Reports"], 2, 4.7, 22, 0, "available", false),
  doer(1017, "Neel Banerjee", ["marketing"], ["SEO", "Paid advertising"], 3, 4.8, 36, 2, "busy", true),
  doer(1018, "Ritika Saxena", ["design", "creative"], ["Social media assets", "Motion graphics"], 1, null, 0, 0, "available", false),
  doer(1019, "Omar Farooq", ["creative"], ["Podcast editing", "Audio cleanup"], 1, 4.1, 3, 0, "away", false),
  doer(1020, "Sneha Pathak", ["design"], ["Brand identity", "Illustration"], 2, 4.6, 13, 3, "busy", false),
  doer(1021, "Yash Thakur", ["design", "creative"], ["Packaging"], 1, null, 0, 0, "available", false, { verification_status: "submitted" }),
  doer(1022, "Ira Malhotra", ["writing"], ["Technical writing"], 1, null, 0, 0, "available", false, { verification_status: "submitted" }),
  doer(1023, "Dhruv Nair", ["it"], ["Mobile apps"], 1, null, 0, 0, "available", false, { verification_status: "submitted" }),
  doer(1024, "Ananya Sen", ["marketing"], ["Influencer marketing"], 1, null, 0, 0, "available", false, { verification_status: "rejected" }),
];

/* Attachments -------------------------------------------------------- */

let attachmentSeq = 1;
export function attachment(kind: Attachment["kind"], filename: string, opts: Partial<Attachment> = {}): Attachment {
  const ext = filename.split(".").pop() ?? "";
  const mime =
    ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : ext === "zip" ? "application/zip" : ext === "mp4" ? "video/mp4" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/octet-stream";
  return {
    id: `att-${attachmentSeq++}`,
    kind,
    filename,
    mime_type: mime,
    size_bytes: 120_000 + ((attachmentSeq * 7919) % 4_800_000),
    uploaded_by_role: kind === "brief" ? "client" : kind === "deliverable" || kind === "snapshot" || kind === "quality_report" ? "coordinator" : "expert",
    scan_status: "clean",
    client_visible: kind === "brief" || kind === "snapshot",
    created_at: ago(2 * HOUR),
    ...opts,
  };
}

/* Projects ----------------------------------------------------------- */

type ProjectSeed = Partial<Project> & Pick<Project, "id" | "code" | "client" | "category" | "title" | "description" | "urgency" | "status" | "created_at">;

function project(seed: ProjectSeed): Project {
  return {
    category_answers: [],
    deadline_utc: null,
    quote_amount: null,
    quote_currency: seed.client.currency,
    quote_amount_inr: null,
    quote_note: null,
    delivery_duration_hours: null,
    quote_expires_at: null,
    quote_sent_at: null,
    credits_applied_inr: 0,
    expected_doer_cost_inr: null,
    margin_inr: null,
    qqd_id: null,
    supervisor_id: null,
    supervisor_assigned_at: null,
    progress_percent: null,
    progress_label: null,
    progress_updated_at: null,
    flag_count: 0,
    revision_count: 0,
    qc_bounce_count: 0,
    last_bounce_reason: null,
    client_revision_reason: null,
    paid_at: null,
    delivered_at: null,
    approved_at: null,
    payout_released_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    updated_at: seed.created_at,
    doers: [],
    failed_offer_count: 0,
    in_open_pool: false,
    self_assigned: false,
    qc: null,
    delivery_note: null,
    attachments: [],
    flags: [],
    unread_client: 0,
    unread_internal: 0,
    held_count: 0,
    ...seed,
  };
}

let pdSeq = 1;
function assignment(projectId: string, doerN: number, discipline: CategorySlug, payout: number, opts: Partial<ProjectDoer> = {}): ProjectDoer {
  return {
    id: `pd-${pdSeq++}`,
    project_id: projectId,
    doer_id: `d-${doerN}`,
    doer_code: `R-${doerN}`,
    discipline,
    payout_amount_inr: payout,
    scope_note: null,
    working_link: null,
    offered_at: ago(5 * HOUR),
    offer_expires_at: ago(3 * HOUR),
    accepted_at: ago(4.5 * HOUR),
    status: "accepted",
    decline_reason: null,
    liability_decision: null,
    partial_payout_inr: null,
    payout_status: "pending",
    required_module_id: null,
    workspace_identity: null,
    ...opts,
  };
}

/** INR equivalents use a fixed demo FX table. Real rates are recorded at capture. */
export const DEMO_FX_TO_INR: Record<Currency, number> = { INR: 1, USD: 84.2, GBP: 107.6, AUD: 55.1, EUR: 91.3, AED: 22.9, CAD: 61.4 };
const inr = (amount: number, currency: Currency) => Math.round(amount * DEMO_FX_TO_INR[currency]);

export const projects: Project[] = [
  /* ---- Awaiting quote: QQD quote queue ---- */
  project({
    id: "p-1284", code: "AX-001284", client: clients.lena, category: "design", urgency: "express", status: "awaiting_quote",
    title: "Logo and brand kit for a specialty coffee roaster",
    description:
      "We roast single-origin coffee in Hamburg and are launching a wholesale line. We need a new logo (wordmark plus a small mark for bag stamps), a colour palette, two typefaces, and a one-page brand sheet. Current logo attached for reference: we want to keep the warmth but look less rustic.",
    category_answers: [
      { question: "What do you need designed?", answer: "Logo, colour palette, typography, one-page brand sheet" },
      { question: "Where will it be used?", answer: "Coffee bags, wholesale price list, website, Instagram" },
      { question: "Do you have brand assets already?", answer: "Yes, an old logo (attached)" },
      { question: "Final file formats", answer: "SVG, PNG, PDF, plus editable source" },
    ],
    deadline_utc: ahead(6 * DAY), created_at: ago(38 * MINUTE),
    attachments: [attachment("brief", "current-logo.png"), attachment("brief", "bag-dieline.pdf")],
  }),
  project({
    id: "p-1285", code: "AX-001285", client: clients.daniel, category: "it", urgency: "urgent", status: "awaiting_quote",
    title: "Fix Stripe webhook retries in a Node.js API",
    description:
      "Our Express API processes Stripe webhooks but duplicate events are creating double subscriptions. We need idempotent handling, proper signature checks, and a short write-up. Repo access will be shared through your workspace.",
    category_answers: [
      { question: "What kind of software work?", answer: "Bug fixing" },
      { question: "Tech stack", answer: "Node.js 20, Express, PostgreSQL, Stripe" },
      { question: "Is there existing code?", answer: "Yes, private GitHub repository" },
    ],
    deadline_utc: ahead(2 * DAY), created_at: ago(12 * MINUTE),
  }),
  project({
    id: "p-1286", code: "AX-001286", client: clients.tom, category: "writing", urgency: "standard", status: "awaiting_quote",
    title: "Six SEO blog posts on home solar financing",
    description:
      "Six posts of about 1,200 words each for an Australian solar installer's blog. Topics: rebates by state, loan vs lease, payback period, battery add-ons, choosing an installer, and maintenance. Friendly but credible tone.",
    category_answers: [
      { question: "Type of writing", answer: "Blog posts" },
      { question: "Length", answer: "Around 1,200 words each, 6 posts" },
      { question: "Audience", answer: "Australian homeowners considering solar" },
      { question: "Keywords provided?", answer: "Yes, a keyword list per post" },
    ],
    deadline_utc: ahead(10 * DAY), created_at: ago(22 * MINUTE),
    attachments: [attachment("brief", "keyword-list.docx")],
  }),
  project({
    id: "p-1287", code: "AX-001287", client: clients.aisha, category: "ai", urgency: "standard", status: "awaiting_quote",
    title: "WhatsApp lead qualification bot connected to HubSpot",
    description:
      "We get 200+ property enquiries a week on WhatsApp. We want a bot that asks four qualifying questions in English or Arabic, scores the lead, and creates a HubSpot contact with the answers. Human handover when the lead asks for an agent.",
    category_answers: [
      { question: "What should the automation do?", answer: "Qualify leads on WhatsApp and push to HubSpot" },
      { question: "Tools involved", answer: "WhatsApp Business API, HubSpot" },
      { question: "Languages", answer: "English and Arabic" },
    ],
    deadline_utc: null, created_at: ago(5 * MINUTE),
  }),
  project({
    id: "p-1288", code: "AX-001288", client: clients.marcus, category: "research", urgency: "standard", status: "awaiting_quote",
    title: "Competitor teardown for a B2B invoicing SaaS",
    description:
      "Our agency client is entering the UK SMB invoicing market. We need a teardown of five competitors: pricing, positioning, onboarding flow, integrations, and review sentiment, with a summary slide of white space opportunities.",
    category_answers: [
      { question: "Type of research", answer: "Competitor analysis" },
      { question: "Deliverable format", answer: "Slide deck plus a source spreadsheet" },
      { question: "Competitors named?", answer: "Yes, five listed in the brief" },
    ],
    deadline_utc: ahead(9 * DAY), created_at: ago(51 * MINUTE),
  }),
  project({
    id: "p-1289", code: "AX-001289", client: clients.aisha, category: "other", urgency: "express", status: "awaiting_quote",
    title: "Translate a 40-page product catalogue into Arabic",
    description:
      "Furniture catalogue in English, about 9,000 words, mostly product names, dimensions and short descriptions. Needs Arabic translation laid back into the existing InDesign file with right-to-left layout.",
    category_answers: [{ question: "Describe what you need", answer: "English to Arabic translation with layout in InDesign" }],
    deadline_utc: ahead(4 * DAY), created_at: ago(3 * MINUTE),
    attachments: [attachment("brief", "catalogue-en.pdf")],
  }),

  /* ---- Awaiting payment ---- */
  project({
    id: "p-1279", code: "AX-001279", client: clients.marcus, category: "creative", urgency: "standard", status: "awaiting_payment",
    title: "30-second product launch video edit",
    description: "Cut a 30-second launch spot from 14 minutes of supplied footage, with captions, licensed music and a 9:16 version for Reels.",
    quote_amount: 42_000, quote_amount_inr: inr(42_000, "GBP"), delivery_duration_hours: 72, quote_expires_at: ahead(20 * HOUR), quote_sent_at: ago(4 * HOUR),
    quote_note: "Includes one 16:9 and one 9:16 export, captions, and licensed music.", expected_doer_cost_inr: 16_500_00, qqd_id: "op-meera",
    deadline_utc: ahead(4 * DAY), created_at: ago(6 * HOUR),
  }),
  project({
    id: "p-1281", code: "AX-001281", client: clients.rahul, category: "marketing", urgency: "express", status: "awaiting_payment",
    title: "Google Ads account restructure",
    description: "Restructure a Google Ads account with 14 messy campaigns into a clean themed structure, rewrite ad copy, and set up conversion tracking.",
    quote_amount: 14_500_00, quote_amount_inr: 14_500_00, delivery_duration_hours: 48, quote_expires_at: ahead(3 * HOUR), quote_sent_at: ago(18 * HOUR),
    expected_doer_cost_inr: 6_000_00, qqd_id: "op-arjun", deadline_utc: ahead(2 * DAY + 3 * HOUR), created_at: ago(20 * HOUR),
  }),

  project({
    id: "p-1282", code: "AX-001282", client: clients.tom, category: "design", urgency: "standard", status: "awaiting_payment",
    title: "Business card and letterhead set",
    description: "Business cards and a letterhead for a small Brisbane accounting firm, matching the existing logo.",
    quote_amount: 18_000, quote_amount_inr: 9_918_00, delivery_duration_hours: 48, quote_expires_at: ago(5 * HOUR), quote_sent_at: ago(2 * DAY),
    expected_doer_cost_inr: 3_500_00, qqd_id: "op-meera", deadline_utc: ahead(43 * HOUR), created_at: ago(3 * DAY),
  }),

  /* ---- Paid, awaiting supervisor: QQD assignment queue ---- */
  project({
    id: "p-1276", code: "AX-001276", client: clients.sophie, category: "design", urgency: "standard", status: "in_progress",
    title: "Pitch deck redesign, 18 slides",
    description: "Redesign an 18-slide Series A deck. Content is final; we need a modern visual system, charts rebuilt, and a Google Slides master.",
    quote_amount: 38_000, quote_amount_inr: inr(38_000, "USD"), delivery_duration_hours: 96, quote_sent_at: ago(1 * DAY), expected_doer_cost_inr: 12_000_00,
    qqd_id: "op-meera", paid_at: ago(9 * MINUTE), deadline_utc: ahead(5 * DAY), created_at: ago(30 * HOUR),
  }),
  project({
    id: "p-1277", code: "AX-001277", client: clients.priya, category: "it", urgency: "express", status: "in_progress",
    title: "Shopify theme speed optimisation",
    description: "Our Shopify store scores 31 on mobile PageSpeed. Need image, script and app cleanup to reach 70+ without breaking the theme.",
    quote_amount: 18_000_00, quote_amount_inr: 18_000_00, delivery_duration_hours: 48, quote_sent_at: ago(5 * HOUR), expected_doer_cost_inr: 7_500_00,
    qqd_id: "op-arjun", paid_at: ago(21 * MINUTE), deadline_utc: ahead(3 * DAY), created_at: ago(7 * HOUR),
  }),
  project({
    id: "p-1278", code: "AX-001278", client: clients.tom, category: "writing", urgency: "standard", status: "in_progress",
    title: "Website copy for a physiotherapy clinic",
    description: "Five pages of website copy: home, services, about, pricing, contact. Warm, plain-English tone for a Brisbane clinic.",
    quote_amount: 52_000, quote_amount_inr: inr(52_000, "AUD"), delivery_duration_hours: 72, quote_sent_at: ago(1 * DAY), expected_doer_cost_inr: 9_500_00,
    qqd_id: "op-meera", paid_at: ago(2 * MINUTE), deadline_utc: ahead(6 * DAY), created_at: ago(26 * HOUR),
  }),

  /* ---- Supervisor (Kabir): sourcing ---- */
  project({
    id: "p-1270", code: "AX-001270", client: clients.priya, category: "design", urgency: "standard", status: "in_progress",
    title: "Packaging design for a vegan protein bar, 3 SKUs",
    description: "Wrapper design for three flavours of a vegan protein bar. Dieline supplied. Needs nutrition panel layout, FSSAI-compliant label areas, and print-ready files.",
    category_answers: [
      { question: "What do you need designed?", answer: "Packaging for 3 SKUs" },
      { question: "Final file formats", answer: "Print-ready PDF with bleed, editable AI files" },
    ],
    quote_amount: 16_500_00, quote_amount_inr: 16_500_00, delivery_duration_hours: 120, quote_sent_at: ago(1 * DAY), expected_doer_cost_inr: 6_500_00,
    qqd_id: "op-meera", supervisor_id: "op-kabir", paid_at: ago(70 * MINUTE), supervisor_assigned_at: ago(60 * MINUTE),
    deadline_utc: ahead(7 * DAY), created_at: ago(28 * HOUR), attachments: [attachment("brief", "bar-dieline.pdf"), attachment("brief", "flavour-notes.docx")],
  }),
  project({
    id: "p-1268", code: "AX-001268", client: clients.grace, category: "creative", urgency: "standard", status: "in_progress",
    title: "Podcast editing, 4 episodes",
    description: "Edit four 45-minute interview episodes: remove filler, level audio, add intro and outro music (supplied), export MP3 and WAV.",
    quote_amount: 26_000, quote_amount_inr: inr(26_000, "USD"), delivery_duration_hours: 96, quote_sent_at: ago(2 * DAY), expected_doer_cost_inr: 8_000_00,
    qqd_id: "op-arjun", supervisor_id: "op-kabir", paid_at: ago(5 * HOUR), supervisor_assigned_at: ago(4.8 * HOUR), failed_offer_count: 2,
    deadline_utc: ahead(6 * DAY), created_at: ago(2 * DAY),
    doers: [
      assignment("p-1268", 1008, "creative", 8_000_00, { status: "declined", accepted_at: null, offered_at: ago(4.6 * HOUR), offer_expires_at: ago(2.6 * HOUR), decline_reason: "At capacity this week" }),
      assignment("p-1268", 1019, "creative", 8_000_00, { status: "expired", accepted_at: null, offered_at: ago(2.5 * HOUR), offer_expires_at: ago(0.5 * HOUR) }),
    ],
  }),
  project({
    id: "p-1272", code: "AX-001272", client: clients.lena, category: "marketing", urgency: "standard", status: "in_progress",
    title: "Instagram content calendar and 12 post designs",
    description: "A one-month content calendar for our café accounts, with captions and 12 designed posts in our new brand style.",
    quote_amount: 34_000, quote_amount_inr: inr(34_000, "EUR"), delivery_duration_hours: 120, quote_sent_at: ago(2 * DAY), expected_doer_cost_inr: 11_000_00,
    qqd_id: "op-meera", supervisor_id: "op-kabir", paid_at: ago(3 * HOUR), supervisor_assigned_at: ago(2.8 * HOUR),
    deadline_utc: ahead(8 * DAY), created_at: ago(2 * DAY),
    doers: [assignment("p-1272", 1007, "marketing", 11_500_00, { status: "offered", accepted_at: null, offered_at: ago(40 * MINUTE), offer_expires_at: ahead(80 * MINUTE) })],
  }),
  project({
    id: "p-1266", code: "AX-001266", client: clients.daniel, category: "design", urgency: "express", status: "in_progress",
    title: "Landing page UI and copy for a fintech waitlist",
    description: "Landing page for a savings app waitlist: hero, three feature blocks, FAQ, signup. Needs the copy written and the UI designed in Figma, desktop and mobile.",
    quote_amount: 72_000, quote_amount_inr: inr(72_000, "CAD"), delivery_duration_hours: 96, quote_sent_at: ago(1 * DAY), expected_doer_cost_inr: 19_000_00,
    qqd_id: "op-meera", supervisor_id: "op-kabir", paid_at: ago(6 * HOUR), supervisor_assigned_at: ago(5.8 * HOUR),
    deadline_utc: ahead(4 * DAY), created_at: ago(1 * DAY),
    doers: [
      assignment("p-1266", 1003, "design", 13_500_00, { accepted_at: ago(25 * MINUTE), offered_at: ago(1 * HOUR), offer_expires_at: ahead(1 * HOUR), scope_note: "UI design in Figma, desktop and mobile" }),
      assignment("p-1266", 1012, "writing", 5_500_00, { status: "offered", accepted_at: null, offered_at: ago(15 * MINUTE), offer_expires_at: ahead(105 * MINUTE), scope_note: "All landing page copy and FAQ" }),
    ],
  }),

  /* ---- Supervisor (Kabir): work underway ---- */
  project({
    id: "p-1259", code: "AX-001259", client: clients.oliver, category: "design", urgency: "standard", status: "in_progress",
    title: "Brand guidelines document, 24 pages",
    description: "Turn an approved identity into a 24-page brand guidelines PDF: logo usage, colour, type, imagery, tone of voice, templates.",
    quote_amount: 64_000, quote_amount_inr: inr(64_000, "GBP"), delivery_duration_hours: 144, quote_sent_at: ago(4 * DAY), expected_doer_cost_inr: 26_000_00,
    qqd_id: "op-meera", supervisor_id: "op-kabir", paid_at: ago(3 * DAY), supervisor_assigned_at: ago(3 * DAY),
    progress_percent: 60, progress_label: "Typography and colour system", progress_updated_at: ago(6 * HOUR),
    deadline_utc: ahead(3 * DAY), created_at: ago(4 * DAY),
    doers: [assignment("p-1259", 1001, "design", 26_000_00, { working_link: "https://www.figma.com/file/ws-expert-07/brand-guidelines", accepted_at: ago(3 * DAY) })],
    attachments: [attachment("snapshot", "guidelines-progress-1.png", { note: "Logo usage and clear space pages", created_at: ago(1 * DAY) })],
  }),
  project({
    id: "p-1255", code: "AX-001255", client: clients.grace, category: "creative", urgency: "express", status: "in_progress",
    title: "YouTube thumbnail set, 20 designs",
    description: "Twenty thumbnails for a cooking channel's back catalogue, consistent style, face cutouts from supplied stills, bold readable titles.",
    quote_amount: 22_000, quote_amount_inr: inr(22_000, "USD"), delivery_duration_hours: 72, quote_sent_at: ago(5 * DAY), expected_doer_cost_inr: 6_500_00,
    qqd_id: "op-arjun", supervisor_id: "op-kabir", paid_at: ago(4 * DAY), supervisor_assigned_at: ago(4 * DAY),
    progress_percent: 35, progress_label: "First 7 thumbnails drafted", progress_updated_at: ago(52 * HOUR), flag_count: 1,
    flags: [{ id: "fl-1", reason: "delay", detail: "It has been two days without an update and the deadline is close.", raised_at: ago(40 * MINUTE), resolved_at: null }],
    deadline_utc: ahead(18 * HOUR), created_at: ago(5 * DAY),
    doers: [assignment("p-1255", 1011, "creative", 6_500_00, { working_link: "https://www.canva.com/design/ws-expert-12/thumbnails", accepted_at: ago(4 * DAY) })],
  }),
  project({
    id: "p-1262", code: "AX-001262", client: clients.sophie, category: "marketing", urgency: "standard", status: "in_progress",
    title: "Email nurture sequence, 7 emails with designs",
    description: "Seven-email onboarding sequence for a project management SaaS trial, with copy, subject line variants and designed templates in Klaviyo.",
    quote_amount: 54_000, quote_amount_inr: inr(54_000, "USD"), delivery_duration_hours: 120, quote_sent_at: ago(4 * DAY), expected_doer_cost_inr: 22_000_00,
    qqd_id: "op-meera", supervisor_id: "op-kabir", paid_at: ago(3.5 * DAY), supervisor_assigned_at: ago(3.5 * DAY),
    progress_percent: 80, progress_label: "Final email designs", progress_updated_at: ago(3 * HOUR),
    deadline_utc: ahead(2 * DAY), created_at: ago(4 * DAY),
    doers: [assignment("p-1262", 1009, "marketing", 22_000_00, { working_link: "https://docs.google.com/document/d/ws-expert-03-nurture", accepted_at: ago(3.4 * DAY) })],
  }),

  /* ---- Supervisor (Kabir): QC queue ---- */
  project({
    id: "p-1251", code: "AX-001251", client: clients.rahul, category: "design", urgency: "standard", status: "in_review",
    title: "Restaurant menu redesign, print and digital",
    description: "Redesign a two-page dine-in menu and a QR digital menu for a Pune restaurant. Keep the existing logo; new layout, icons for veg and non-veg, spice levels.",
    quote_amount: 12_000_00, quote_amount_inr: 12_000_00, delivery_duration_hours: 72, quote_sent_at: ago(4 * DAY), expected_doer_cost_inr: 4_800_00,
    qqd_id: "op-arjun", supervisor_id: "op-kabir", paid_at: ago(3 * DAY), supervisor_assigned_at: ago(3 * DAY),
    progress_percent: 100, progress_label: "Submitted for final checks", progress_updated_at: ago(1 * HOUR), updated_at: ago(1 * HOUR),
    deadline_utc: ahead(1 * DAY), created_at: ago(4 * DAY),
    doers: [assignment("p-1251", 1004, "design", 4_800_00, { working_link: "https://www.figma.com/file/ws-expert-04/menu", accepted_at: ago(3 * DAY) })],
    attachments: [
      attachment("revision", "menu-print-v1.pdf", { uploaded_by_role: "expert", created_at: ago(1 * HOUR) }),
      attachment("revision", "menu-digital-v1.png", { uploaded_by_role: "expert", created_at: ago(1 * HOUR) }),
      attachment("revision", "menu-source.zip", { uploaded_by_role: "expert", created_at: ago(1 * HOUR) }),
    ],
  }),
  project({
    id: "p-1249", code: "AX-001249", client: clients.marcus, category: "creative", urgency: "express", status: "in_review",
    title: "Explainer animation, 60 seconds",
    description: "A 60-second 2D explainer for a logistics app, from an approved script and storyboard. Voiceover supplied. Brand colours provided.",
    quote_amount: 68_000, quote_amount_inr: inr(68_000, "GBP"), delivery_duration_hours: 120, quote_sent_at: ago(6 * DAY), expected_doer_cost_inr: 30_000_00,
    qqd_id: "op-meera", supervisor_id: "op-kabir", paid_at: ago(5.5 * DAY), supervisor_assigned_at: ago(5.5 * DAY), revision_count: 1,
    progress_percent: 100, progress_label: "Submitted for final checks", progress_updated_at: ago(5 * HOUR), updated_at: ago(5 * HOUR),
    deadline_utc: ahead(10 * HOUR), created_at: ago(6 * DAY),
    qc: { checks: { licensed: true, export: true }, custom_checks: [], notes: "Music licence confirmed. Check audio levels at 0:42.", completed_at: null },
    doers: [assignment("p-1249", 1015, "creative", 30_000_00, { working_link: "https://drive.google.com/drive/folders/ws-expert-15", accepted_at: ago(5.4 * DAY) })],
    attachments: [
      attachment("revision", "explainer-60s-v2.mp4", { uploaded_by_role: "expert", created_at: ago(5 * HOUR) }),
      attachment("deliverable", "explainer-60s-1080p.mp4", { created_at: ago(2 * HOUR), client_visible: false }),
    ],
  }),

  /* ---- Delivered ---- */
  project({
    id: "p-1240", code: "AX-001240", client: clients.priya, category: "design", urgency: "standard", status: "delivered",
    title: "Event poster series, 5 posters",
    description: "Five posters for a college alumni music night, A3 print and Instagram sizes.",
    quote_amount: 8_500_00, quote_amount_inr: 8_500_00, delivery_duration_hours: 72, expected_doer_cost_inr: 3_000_00, qqd_id: "op-arjun",
    supervisor_id: "op-kabir", paid_at: ago(6 * DAY), supervisor_assigned_at: ago(6 * DAY), delivered_at: ago(2 * DAY),
    progress_percent: 100, progress_label: "Delivered", progress_updated_at: ago(2 * DAY), created_at: ago(7 * DAY),
    qc: { checks: { source: true, licensed: true, formats: true, brand: true }, custom_checks: [], notes: "", completed_at: ago(2 * DAY) },
    delivery_note: "All five posters in A3 print PDF and 1080x1350 for Instagram, with editable source files.",
    doers: [assignment("p-1240", 1002, "design", 3_000_00, { working_link: "https://www.canva.com/design/ws-expert-02/posters", accepted_at: ago(6 * DAY) })],
    attachments: [attachment("deliverable", "posters-print.zip", { created_at: ago(2 * DAY) }), attachment("deliverable", "posters-instagram.zip", { created_at: ago(2 * DAY) })],
  }),
  project({
    id: "p-1231", code: "AX-001231", client: clients.daniel, category: "marketing", urgency: "standard", status: "delivered",
    title: "SEO audit and prioritised fix list",
    description: "Technical and on-page SEO audit of a 60-page B2B site with a prioritised fix list.",
    quote_amount: 46_000, quote_amount_inr: inr(46_000, "CAD"), delivery_duration_hours: 96, expected_doer_cost_inr: 12_500_00, qqd_id: "op-meera",
    supervisor_id: "op-kabir", paid_at: ago(20 * DAY), supervisor_assigned_at: ago(20 * DAY), delivered_at: ago(15 * DAY),
    progress_percent: 100, progress_label: "Delivered", progress_updated_at: ago(15 * DAY), created_at: ago(21 * DAY),
    qc: { checks: { goal: true, sources: true, access: true }, custom_checks: [], notes: "", completed_at: ago(15 * DAY) },
    delivery_note: "Audit report, crawl export, and a 42-item fix list ranked by impact.",
    doers: [assignment("p-1231", 1017, "marketing", 12_500_00, { working_link: "https://docs.google.com/document/d/ws-expert-09-seo", accepted_at: ago(19 * DAY) })],
    attachments: [attachment("deliverable", "seo-audit.pdf", { created_at: ago(15 * DAY) })],
  }),

  /* ---- Completed: QQD disbursement queue ---- */
  project({
    id: "p-1228", code: "AX-001228", client: clients.sophie, category: "design", urgency: "standard", status: "completed",
    title: "Mobile app icon set, 48 icons",
    description: "A 48-icon line set for a fitness app in three weights, SVG and Figma components.",
    quote_amount: 19_000, quote_amount_inr: inr(19_000, "USD"), expected_doer_cost_inr: 6_000_00, qqd_id: "op-meera", supervisor_id: "op-kabir",
    paid_at: ago(5 * DAY), delivered_at: ago(1 * DAY), approved_at: ago(3 * HOUR), created_at: ago(6 * DAY),
    doers: [assignment("p-1228", 1001, "design", 6_000_00, { accepted_at: ago(5 * DAY), status: "completed" })],
  }),
  project({
    id: "p-1224", code: "AX-001224", client: clients.oliver, category: "writing", urgency: "standard", status: "completed",
    title: "Ghostwritten LinkedIn articles, 8 pieces",
    description: "Eight 900-word LinkedIn articles for an agency founder, from recorded interviews.",
    quote_amount: 48_000, quote_amount_inr: inr(48_000, "GBP"), expected_doer_cost_inr: 17_000_00, qqd_id: "op-arjun", supervisor_id: "op-rohan",
    paid_at: ago(9 * DAY), delivered_at: ago(2 * DAY), approved_at: ago(20 * HOUR), created_at: ago(10 * DAY),
    doers: [assignment("p-1224", 1012, "writing", 17_000_00, { accepted_at: ago(9 * DAY), status: "completed" })],
  }),
  project({
    id: "p-1219", code: "AX-001219", client: clients.rahul, category: "it", urgency: "standard", status: "completed",
    title: "Shopify to BigQuery data pipeline",
    description: "Daily sync of Shopify orders, customers and products into BigQuery with a Looker Studio starter dashboard.",
    quote_amount: 38_000_00, quote_amount_inr: 38_000_00, expected_doer_cost_inr: 15_000_00, qqd_id: "op-meera", supervisor_id: "op-ananya",
    paid_at: ago(12 * DAY), delivered_at: ago(3 * DAY), approved_at: ago(30 * HOUR), created_at: ago(13 * DAY),
    doers: [assignment("p-1219", 1013, "it", 15_000_00, { accepted_at: ago(12 * DAY), status: "completed", payout_status: "failed" })],
  }),
  project({
    id: "p-1213", code: "AX-001213", client: clients.grace, category: "design", urgency: "standard", status: "completed",
    title: "Wedding website illustrations",
    description: "Six watercolour-style illustrations for a wedding website.",
    quote_amount: 21_000, quote_amount_inr: inr(21_000, "USD"), expected_doer_cost_inr: 7_000_00, qqd_id: "op-arjun", supervisor_id: "op-kabir",
    paid_at: ago(18 * DAY), delivered_at: ago(10 * DAY), approved_at: ago(8 * DAY), payout_released_at: ago(7 * DAY), created_at: ago(19 * DAY),
    doers: [assignment("p-1213", 1002, "design", 7_000_00, { accepted_at: ago(18 * DAY), status: "completed", payout_status: "released" })],
  }),

  /* ---- Cancelled ---- */
  project({
    id: "p-1215", code: "AX-001215", client: clients.lena, category: "research", urgency: "standard", status: "cancelled",
    title: "Market sizing for an EV charging startup",
    description: "TAM, SAM and SOM for workplace EV charging in Germany.",
    quote_amount: 41_000, quote_amount_inr: inr(41_000, "EUR"), qqd_id: "op-meera", supervisor_id: "op-rohan",
    paid_at: ago(14 * DAY), cancelled_at: ago(9 * DAY), cancellation_reason: "refunded", created_at: ago(15 * DAY),
  }),
];

/* Messages ----------------------------------------------------------- */

let msgSeq = 1;
type MsgSeed = Pick<Message, "channel" | "sender_role" | "sender_label" | "body"> & Partial<Message>;
function msg(projectId: string, at: string, seed: MsgSeed): Message {
  return {
    id: `m-${msgSeq++}`,
    project_id: projectId,
    sender_id: null,
    discipline: null,
    state: "delivered",
    held_reason: null,
    screen_note: null,
    moderated_by: null,
    moderated_at: null,
    created_at: at,
    attachments: [],
    ...seed,
  };
}

const sys = (projectId: string, at: string, body: string) => msg(projectId, at, { channel: "client", sender_role: "system", sender_label: "System", body });

export const messages: Message[] = [
  // Quote queue clarifications
  sys("p-1284", ago(38 * MINUTE), "Task submitted"),
  msg("p-1284", ago(34 * MINUTE), { channel: "client", sender_role: "client", sender_label: "Lena Hoffmann", sender_id: "c-lena", body: "One more thing: the wholesale line launches at a trade fair, so the brand sheet needs to be ready a few days before." }),
  sys("p-1285", ago(12 * MINUTE), "Task submitted"),
  sys("p-1286", ago(22 * MINUTE), "Task submitted"),
  sys("p-1287", ago(5 * MINUTE), "Task submitted"),
  sys("p-1288", ago(51 * MINUTE), "Task submitted"),
  sys("p-1289", ago(3 * MINUTE), "Task submitted"),

  // Sourcing projects
  sys("p-1270", ago(28 * HOUR), "Task submitted"),
  sys("p-1270", ago(1 * DAY), "A quote has been sent"),
  sys("p-1270", ago(70 * MINUTE), "Payment confirmed"),
  msg("p-1270", ago(55 * MINUTE), { channel: "client", sender_role: "coordinator", sender_label: "Kabir Malhotra", sender_id: "op-kabir", body: "Thanks Priya, payment received. I'm lining up a packaging specialist now and will share first concepts within two days." }),
  msg("p-1270", ago(20 * MINUTE), { channel: "client", sender_role: "client", sender_label: "Priya Nambiar", sender_id: "c-priya", body: "Great. Can the chocolate flavour lean darker? Our competitor uses a light brown and we want to stand apart." }),

  sys("p-1268", ago(5 * HOUR), "Payment confirmed"),
  sys("p-1272", ago(3 * HOUR), "Payment confirmed"),

  sys("p-1266", ago(6 * HOUR), "Payment confirmed"),
  sys("p-1266", ago(25 * MINUTE), "A design expert has been allotted to your project"),
  msg("p-1266", ago(22 * MINUTE), { channel: "internal", sender_role: "coordinator", sender_label: "Kabir Malhotra", sender_id: "op-kabir", body: "Welcome aboard R-1003. Brief is in the project. I'm setting up the Figma file under the company workspace now; you'll get the link here shortly." }),
  msg("p-1266", ago(2 * MINUTE), {
    channel: "internal", sender_role: "expert", sender_label: "R-1003", sender_id: "d-1003", discipline: "design",
    body: "Thanks! Quicker if you add me on telegram, I'm @vik_designs there, I check it more often.", state: "held", held_reason: "contact_details",
    screen_note: "Shares a messaging handle and invites contact off-platform.",
  }),

  // Underway
  sys("p-1259", ago(3 * DAY), "A design expert has been allotted to your project"),
  msg("p-1259", ago(1 * DAY), { channel: "client", sender_role: "coordinator", sender_label: "Kabir Malhotra", sender_id: "op-kabir", body: "Progress snapshot posted: logo usage and clear space pages are done. Typography and colour pages are next.", attachments: [] }),
  msg("p-1259", ago(7 * HOUR), { channel: "client", sender_role: "client", sender_label: "Oliver Grant", sender_id: "c-oliver", body: "Looks sharp. Could the imagery section include do and don't examples?" }),
  msg("p-1259", ago(6.5 * HOUR), { channel: "internal", sender_role: "coordinator", sender_label: "Kabir Malhotra", sender_id: "op-kabir", body: "Client wants do and don't examples in the imagery section. Can you add a spread for that?" }),
  msg("p-1259", ago(6 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1001", sender_id: "d-1001", discipline: "design", body: "Yes, will add two spreads. Typography pages done today." }),
  msg("p-1259", ago(11 * MINUTE), {
    channel: "client", sender_role: "expert", sender_label: "R-1001", sender_id: "d-1001", discipline: "design",
    body: "Happy to add those. I studied at NID Ahmedabad so this editorial style is very familiar to me, will share soon.", state: "held", held_reason: "identity_reveal",
    screen_note: "Names the expert's educational institution.",
  }),

  sys("p-1255", ago(4 * DAY), "A media expert has been allotted to your project"),
  msg("p-1255", ago(41 * MINUTE), { channel: "client", sender_role: "client", sender_label: "Grace Kim", sender_id: "c-grace", body: "Hi, it has been two days without an update and the deadline is tomorrow. Are we still on track?" }),
  sys("p-1255", ago(40 * MINUTE), "This project has been escalated"),
  msg("p-1255", ago(30 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1011", sender_id: "d-1011", discipline: "creative", body: "Seven done, working through the rest. Some stills are low resolution, may need to upscale." }),

  sys("p-1262", ago(3.4 * DAY), "A marketing expert has been allotted to your project"),
  msg("p-1262", ago(25 * MINUTE), { channel: "client", sender_role: "client", sender_label: "Sophie Laurent", sender_id: "c-sophie", body: "The welcome email draft reads great. Can we see the designed version before Friday?" }),
  msg("p-1262", ago(6 * MINUTE), {
    channel: "client", sender_role: "expert", sender_label: "R-1009", sender_id: "d-1009", discipline: "marketing",
    body: "Sure! If it is easier we can go through the designs on a quick call, my number is nine eight two zero, four one one, seven seven three.", state: "held", held_reason: "contact_details",
    screen_note: "Phone number written out in words.",
  }),

  // Client-side held message
  msg("p-1272", ago(19 * MINUTE), {
    channel: "client", sender_role: "client", sender_label: "Lena Hoffmann", sender_id: "c-lena",
    body: "If the designer has questions about our café photos they can also email me directly at lena dot h at roastco dot de.", state: "held", held_reason: "contact_details",
    screen_note: "Client shares an obfuscated email address while an expert may join the thread.",
  }),

  // QC
  sys("p-1251", ago(1 * HOUR), "Your work is in final checks"),
  msg("p-1251", ago(1 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1004", sender_id: "d-1004", discipline: "design", body: "Submitted. Print PDF has 3mm bleed, digital menu exported at 2x. Source zip has the Figma export and fonts list." }),
  sys("p-1249", ago(5 * HOUR), "Your work is in final checks"),
  msg("p-1249", ago(5 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1015", sender_id: "d-1015", discipline: "creative", body: "v2 uploaded with the revised scene 4 and the new voiceover timing." }),

  // Delivered
  sys("p-1240", ago(2 * DAY), "Your work has been delivered"),
  sys("p-1231", ago(15 * DAY), "Your work has been delivered"),
];

/* Verification ------------------------------------------------------- */

export const verificationCases: VerificationCase[] = [
  {
    id: "vc-1", doer_id: "d-1021", doer_code: "R-1021", full_name: "Yash Thakur", declared_name: "Yash Thakur", fields: ["design", "creative"], submitted_at: ago(3 * HOUR),
    stage: "document_check", documents: [{ kind: "pan", label: "PAN card", legible: null, name_matches: null }, { kind: "photo_id", label: "Aadhaar card", legible: null, name_matches: null }],
    payout_method: "upi", payout_name_matches: null, assigned_supervisor_id: null, rejection_reason: null,
  },
  {
    id: "vc-2", doer_id: "d-1022", doer_code: "R-1022", full_name: "Ira Malhotra", declared_name: "Ira Malhotra", fields: ["writing"], submitted_at: ago(9 * HOUR),
    stage: "awaiting_supervisor", documents: [{ kind: "pan", label: "PAN card", legible: true, name_matches: true }, { kind: "photo_id", label: "Passport", legible: true, name_matches: true }],
    payout_method: "bank", payout_name_matches: true, assigned_supervisor_id: null, rejection_reason: null,
  },
  {
    id: "vc-3", doer_id: "d-1023", doer_code: "R-1023", full_name: "Dhruv Nair", declared_name: "Dhruv Nair", fields: ["it"], submitted_at: ago(1 * DAY),
    stage: "supervisor_call", documents: [{ kind: "pan", label: "PAN card", legible: true, name_matches: true }, { kind: "photo_id", label: "Driving licence", legible: true, name_matches: true }],
    payout_method: "bank", payout_name_matches: true, assigned_supervisor_id: "op-kabir", rejection_reason: null,
  },
  {
    id: "vc-4", doer_id: "d-1024", doer_code: "R-1024", full_name: "Ananya Sen", declared_name: "Ananya Sen", fields: ["marketing"], submitted_at: ago(3 * DAY),
    stage: "rejected", documents: [{ kind: "pan", label: "PAN card", legible: false, name_matches: null }, { kind: "photo_id", label: "Voter ID", legible: true, name_matches: true }],
    payout_method: "upi", payout_name_matches: null, assigned_supervisor_id: null, rejection_reason: "PAN image is blurred. Please upload a clear photo of the full card.",
  },
];

/* Support ------------------------------------------------------------ */

const entry = (id: string, kind: Ticket["entries"][number]["kind"], author_label: string, body: string, created_at: string) => ({ id, kind, author_label, body, created_at });

export const tickets: Ticket[] = [
  {
    id: "t-416", reference: "SUP-000416", subject: "Do you take on academic essay work?", category: "general", priority: "low", status: "new", source: "contact_form",
    owner_id: null, project_id: null, project_code: null, requester: { role: "client", label: "Website visitor" }, created_at: ago(18 * MINUTE),
    first_response_at: null, resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [entry("te-1", "requester", "Website visitor", "Hi, I need a 3,000 word essay for my MBA course by next week. Can your experts write it?", ago(18 * MINUTE))],
  },
  {
    id: "t-415", reference: "SUP-000415", subject: "Third flag raised on AX-001244", category: "quality_complaint", priority: "critical", status: "new", source: "third_flag",
    owner_id: null, project_id: null, project_code: "AX-001244", requester: { role: "client", label: "Marcus Bell" }, created_at: ago(12 * MINUTE),
    first_response_at: null, resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [
      entry("te-2", "event", "System", "Automatic escalation: third flag raised (quality). Supervisor Farhan Siddiqui. Project escalated to QQD.", ago(12 * MINUTE)),
      entry("te-3", "requester", "Marcus Bell", "The second revision still has the old pricing table. This is the third time I have had to point it out.", ago(12 * MINUTE)),
    ],
  },
  {
    id: "t-412", reference: "SUP-000412", subject: "Posters use the wrong brand colour", category: "quality_complaint", priority: "high", status: "new", source: "project_link",
    owner_id: null, project_id: "p-1240", project_code: "AX-001240", requester: { role: "client", label: "Priya Nambiar" }, created_at: ago(25 * MINUTE),
    first_response_at: null, resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [entry("te-4", "requester", "Priya Nambiar", "The posters use a purple that is not our alumni association colour. I attached our colour code in the brief. I have not approved yet.", ago(25 * MINUTE))],
  },
  {
    id: "t-409", reference: "SUP-000409", subject: "Partial refund request for delayed thumbnails", category: "refund_request", priority: "high", status: "in_progress", source: "in_app",
    owner_id: "op-devika", project_id: "p-1255", project_code: "AX-001255", requester: { role: "client", label: "Grace Kim" }, created_at: ago(3 * HOUR),
    first_response_at: ago(2.5 * HOUR), resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [
      entry("te-5", "requester", "Grace Kim", "Given the delay I would like a partial refund. I needed these for a scheduled upload week.", ago(3 * HOUR)),
      entry("te-6", "reply", "Support", "Thanks Grace, I am looking into the timeline with your coordinator and will come back to you today.", ago(2.5 * HOUR)),
      entry("te-7", "internal_note", "Devika Nair", "Progress stale for 52h. Supervisor says doer had low-res stills. Considering 20 percent partial if delivery slips past deadline.", ago(2 * HOUR)),
    ],
  },
  {
    id: "t-405", reference: "SUP-000405", subject: "Payout for AX-001198 not received", category: "doer_issue", priority: "normal", status: "awaiting_internal", source: "doer_report",
    owner_id: "op-ishita", project_id: null, project_code: "AX-001198", requester: { role: "doer", label: "R-1015" }, created_at: ago(1 * DAY),
    first_response_at: ago(20 * HOUR), resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [
      entry("te-8", "requester", "R-1015", "The client approved AX-001198 four days ago but I have not received the payout.", ago(1 * DAY)),
      entry("te-9", "internal_note", "Ishita Bose", "Asked QQD to check the RazorpayX transfer status.", ago(20 * HOUR)),
    ],
  },
  {
    id: "t-401", reference: "SUP-000401", subject: "GST invoice needs company name", category: "billing", priority: "normal", status: "awaiting_requester", source: "in_app",
    owner_id: "op-devika", project_id: null, project_code: "AX-001207", requester: { role: "client", label: "Rahul Mehta" }, created_at: ago(2 * DAY),
    first_response_at: ago(46 * HOUR), resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [
      entry("te-10", "requester", "Rahul Mehta", "Please reissue the invoice with our company name and GSTIN so we can claim input credit.", ago(2 * DAY)),
      entry("te-11", "reply", "Support", "Happy to help. Please share the exact registered company name and GSTIN.", ago(46 * HOUR)),
    ],
  },
  {
    id: "t-398", reference: "SUP-000398", subject: "Cannot download invoice PDF", category: "technical", priority: "low", status: "resolved", source: "in_app",
    owner_id: "op-ishita", project_id: null, project_code: "AX-001190", requester: { role: "client", label: "Tom Reynolds" }, created_at: ago(4 * DAY),
    first_response_at: ago(4 * DAY - 3 * HOUR), resolved_at: ago(3 * DAY), resolution: "Browser was blocking pop-ups. Shared the direct download steps.", refund_recommendation: null,
    entries: [entry("te-12", "requester", "Tom Reynolds", "The invoice button does nothing.", ago(4 * DAY))],
  },
];

/* Refunds approved by Support, awaiting QQD -------------------------- */

export const refunds: RefundRequest[] = [
  {
    id: "rf-1", ticket_reference: "SUP-000394",
    project: { id: "p-1236", code: "AX-001236", title: "Product photo retouching, 60 images", category: "creative", quote_amount: 36_000, quote_currency: "GBP", quote_amount_inr: inr(36_000, "GBP"), status: "in_progress" },
    kind: "partial", amount: 12_000, currency: "GBP", recommended_by: "Devika Nair",
    recommendation: "Client received 40 of 60 images on time; remaining 20 delivered three days late after two reminders. Recommend refunding one third.",
    liability_decision: "partial", liability_reason: "20 of 60 images were three days late after two reminders. Doer paid two thirds.", liability_decided_by: "Kabir Malhotra",
    approved_at: ago(5 * HOUR), status: "awaiting_execution", executed_by: null, executed_at: null,
  },
  {
    id: "rf-2", ticket_reference: "SUP-000388",
    project: { id: "p-1215", code: "AX-001215", title: "Market sizing for an EV charging startup", category: "research", quote_amount: 41_000, quote_currency: "EUR", quote_amount_inr: inr(41_000, "EUR"), status: "cancelled" },
    kind: "full", amount: 41_000, currency: "EUR", recommended_by: "Ishita Bose",
    recommendation: "No doer accepted within the window and the client's board date passed. Company process failure, full refund.",
    liability_decision: "company_process", liability_reason: "No doer was found in time. Not the doer's fault.", liability_decided_by: "Rohan Verma",
    approved_at: ago(10 * DAY), status: "executed", executed_by: "Meera Krishnan", executed_at: ago(9 * DAY),
  },
];

/* Training ----------------------------------------------------------- */

export const trainingModules: TrainingModule[] = [
  { id: "tm-1", title: "Working in company workspaces", description: "How to use the anonymous workspace identity, where files live, and what never to sign into.", audience: "doer", categories: [], state: "published", has_assessment: true, completion_rate: 0.86, completions: 214, updated_at: ago(20 * DAY), body: "Every project gets a company workspace. You sign in with the login your supervisor gives you, never your own account.\n\nKeep all files inside that workspace. Do not download client files to personal drives.\n\nIf you cannot open the workspace, message your supervisor in the project chat.", video_url: "https://www.loom.com/share/workspace-basics", files: [], questions: [{ id: "q1", prompt: "Where do you keep project files?", options: ["My own drive", "The company workspace", "Email"], answer: 1 }], completion_by_category: { design: 0.62, creative: 0.48, writing: 0.91 } },
  { id: "tm-2", title: "Packaging print production basics", description: "Dielines, bleed, safe zones, CMYK and spot colours, and label compliance areas.", audience: "doer", categories: ["design"], state: "published", has_assessment: true, completion_rate: 0.41, completions: 38, updated_at: ago(12 * DAY), body: "Start from the dieline the client supplied. Keep 3 mm bleed on every edge.\n\nUse CMYK for print files and note any spot colours.\n\nLeave the label areas the dieline marks for nutrition and legal text.", video_url: null, files: [], questions: [], completion_by_category: {} },
  { id: "tm-3", title: "Running quality checks before delivery", description: "Category checklists, originality and AI reports, and writing a delivery note.", audience: "supervisor", categories: [], state: "published", has_assessment: false, completion_rate: 1, completions: 9, updated_at: ago(30 * DAY), body: "Run the checklist for the category before you deliver.\n\nFor written work, attach the originality and AI report.\n\nWrite a short delivery note: what is included and how to use it.", video_url: null, files: [], questions: [], completion_by_category: {} },
  { id: "tm-4", title: "Moderating held messages", description: "What counts as contact details and identity reveals, and when legitimate task content is fine.", audience: "both", categories: [], state: "published", has_assessment: true, completion_rate: 0.72, completions: 160, updated_at: ago(8 * DAY), body: "Hold a message if it shares a phone, email, handle or payment detail for contact, or reveals who the doer is.\n\nApprove it if the detail is part of the task, such as a phone number printed on a poster.", video_url: "https://www.youtube.com/watch?v=moderation101", files: [], questions: [{ id: "q1", prompt: "Where do you keep project files?", options: ["My own drive", "The company workspace", "Email"], answer: 1 }], completion_by_category: { design: 0.62, creative: 0.48, writing: 0.91 } },
  { id: "tm-5", title: "Licensed music and footage for video work", description: "Approved libraries, licence records, and what to attach to QC.", audience: "doer", categories: ["creative"], state: "draft", has_assessment: false, completion_rate: 0, completions: 0, updated_at: ago(2 * DAY), body: "Use only music and footage from the approved libraries.\n\nSave the licence record and attach it to the quality check.", video_url: null, files: [], questions: [], completion_by_category: {} },
];

/* Rate reference (INR base, other currencies derived for the demo) */

const BANDS: [CategorySlug, string, number, number, number][] = [
  ["writing", "Short piece (under 1,500 words)", 2_500, 4_000, 6_500],
  ["writing", "Multi-piece pack (4 to 8 pieces)", 12_000, 20_000, 32_000],
  ["design", "Single asset (logo, poster, icon)", 4_000, 7_500, 12_000],
  ["design", "Brand kit or multi-page system", 14_000, 24_000, 40_000],
  ["design", "Packaging, per SKU", 4_500, 6_500, 9_500],
  ["creative", "Short video (under 60s)", 9_000, 15_000, 26_000],
  ["creative", "Audio editing, per episode", 1_800, 3_000, 4_500],
  ["it", "Bug fix or small feature", 6_000, 12_000, 20_000],
  ["it", "Integration or data pipeline", 20_000, 35_000, 60_000],
  ["ai", "Single workflow automation", 10_000, 18_000, 30_000],
  ["ai", "Conversational agent with integrations", 25_000, 45_000, 80_000],
  ["marketing", "Audit or restructure", 8_000, 14_000, 24_000],
  ["marketing", "Campaign or content set", 10_000, 18_000, 30_000],
  ["research", "Single report", 8_000, 15_000, 25_000],
  ["research", "Competitor or market teardown", 15_000, 26_000, 42_000],
];

export const rateBands: RateBand[] = BANDS.flatMap(([category, scope_band, low, typical, high], i) =>
  (["INR", "USD", "GBP", "EUR", "AUD", "AED", "CAD"] as Currency[]).map((currency) => {
    const k = DEMO_FX_TO_INR[currency];
    const conv = (v: number) => (currency === "INR" ? v * 100 : Math.round((v / k) * 1.25) * 100);
    return { id: `rb-${i}-${currency}`, category, scope_band, currency, low: conv(low), typical: conv(typical), high: conv(high) };
  }),
);

/* Ledger ------------------------------------------------------------- */

export const ledger: LedgerEntry[] = [
  { id: "lg-1", type: "payment_captured", project_code: "AX-001278", amount: 52_000, currency: "AUD", inr_equivalent: inr(52_000, "AUD"), fx_rate: DEMO_FX_TO_INR.AUD, actor: "Razorpay webhook", provider_ref: "pay_demo_9KQ2", created_at: ago(2 * MINUTE) },
  { id: "lg-2", type: "payment_captured", project_code: "AX-001276", amount: 38_000, currency: "USD", inr_equivalent: inr(38_000, "USD"), fx_rate: DEMO_FX_TO_INR.USD, actor: "Razorpay webhook", provider_ref: "pay_demo_9KP7", created_at: ago(9 * MINUTE) },
  { id: "lg-3", type: "payment_captured", project_code: "AX-001277", amount: 18_000_00, currency: "INR", inr_equivalent: 18_000_00, fx_rate: 1, actor: "Razorpay webhook", provider_ref: "pay_demo_9KN1", created_at: ago(21 * MINUTE) },
  { id: "lg-4", type: "payout_executed", project_code: "AX-001213", amount: 7_000_00, currency: "INR", inr_equivalent: 7_000_00, fx_rate: null, actor: "Arjun Rao", provider_ref: "pout_demo_4H2", created_at: ago(7 * DAY) },
  { id: "lg-5", type: "reserve_held", project_code: "AX-001213", amount: 1_067_00, currency: "INR", inr_equivalent: 1_067_00, fx_rate: null, actor: "System", provider_ref: null, created_at: ago(7 * DAY) },
  { id: "lg-6", type: "refund_executed", project_code: "AX-001215", amount: 41_000, currency: "EUR", inr_equivalent: inr(41_000, "EUR"), fx_rate: DEMO_FX_TO_INR.EUR, actor: "Meera Krishnan", provider_ref: "rfnd_demo_2B9", created_at: ago(9 * DAY) },
  { id: "lg-7", type: "credits_applied", project_code: "AX-001270", amount: 0, currency: "INR", inr_equivalent: 0, fx_rate: null, actor: "Client", provider_ref: null, created_at: ago(70 * MINUTE) },
];

/* Activity and notifications ---------------------------------------- */

let evSeq = 1;
const ev = (kind: ActivityEvent["kind"], project_code: string | null, text: string, actor_label: string, at: string): ActivityEvent => ({
  id: `ev-${evSeq++}`,
  project_id: project_code ? `p-${project_code.slice(-4)}` : null,
  project_code,
  kind,
  text,
  actor_label,
  created_at: at,
});

export const activity: ActivityEvent[] = [
  ev("message_held", "AX-001266", "Internal message from R-1003 held: contact details", "Screening", ago(2 * MINUTE)),
  ev("paid", "AX-001278", "Payment captured, entered assignment queue", "Razorpay", ago(2 * MINUTE)),
  ev("submitted", "AX-001289", "New task submitted: Something Else", "Client", ago(3 * MINUTE)),
  ev("message_held", "AX-001262", "Client-thread message from R-1009 held: contact details", "Screening", ago(6 * MINUTE)),
  ev("message_held", "AX-001259", "Client-thread message from R-1001 held: identity reveal", "Screening", ago(11 * MINUTE)),
  ev("offer_sent", "AX-001266", "Offer sent to R-1012 for the copy part", "Kabir Malhotra", ago(15 * MINUTE)),
  ev("message_held", "AX-001272", "Client message held: contact details", "Screening", ago(19 * MINUTE)),
  ev("offer_accepted", "AX-001266", "R-1003 accepted the design part", "R-1003", ago(25 * MINUTE)),
  ev("flag", "AX-001255", "Client raised flag 1 of 3: delay", "Client", ago(40 * MINUTE)),
  ev("offer_sent", "AX-001272", "Offer sent to R-1007", "Kabir Malhotra", ago(40 * MINUTE)),
  ev("supervisor_assigned", "AX-001270", "Assigned to Kabir Malhotra", "Meera Krishnan", ago(60 * MINUTE)),
  ev("submitted_for_review", "AX-001251", "R-1004 submitted work for final checks", "R-1004", ago(1 * HOUR)),
  ev("approved", "AX-001228", "Client approved delivery, payout queued", "Client", ago(3 * HOUR)),
  ev("submitted_for_review", "AX-001249", "R-1015 submitted v2 for final checks", "R-1015", ago(5 * HOUR)),
];

export const notifications: Record<"qqd" | "supervisor" | "support", PortalNotification[]> = {
  qqd: [
    { id: "n-q1", title: "Quote queue breach", body: "AX-001288 has waited 51 minutes and was escalated to the QQD lead.", href: "/quotes/p-1288", tone: "danger", created_at: ago(6 * MINUTE), read_at: null },
    { id: "n-q2", title: "Assignment overdue", body: "AX-001277 has been paid for 21 minutes without a supervisor.", href: "/assignment", tone: "warning", created_at: ago(6 * MINUTE), read_at: null },
    { id: "n-q3", title: "Payout failed", body: "AX-001219 transfer to R-1013 failed: beneficiary name mismatch.", href: "/disbursement", tone: "danger", created_at: ago(5 * HOUR), read_at: null },
    { id: "n-q4", title: "Refund approved by Support", body: "SUP-000394 partial refund for AX-001236 is ready to execute.", href: "/refunds", tone: "info", created_at: ago(5 * HOUR), read_at: ago(4 * HOUR) },
  ],
  supervisor: [
    { id: "n-s1", title: "Message held", body: "R-1003 shared a messaging handle in the internal thread of AX-001266.", href: "/moderation", tone: "warning", created_at: ago(2 * MINUTE), read_at: null },
    { id: "n-s2", title: "Flag raised: respond within 2 hours", body: "Grace Kim flagged AX-001255 for delay.", href: "/projects/p-1255", tone: "danger", created_at: ago(40 * MINUTE), read_at: null },
    { id: "n-s3", title: "New project assigned", body: "AX-001270 packaging design was assigned to you.", href: "/projects/p-1270", tone: "info", created_at: ago(60 * MINUTE), read_at: null },
    { id: "n-s4", title: "Work submitted", body: "R-1004 submitted AX-001251 for final checks.", href: "/qc/p-1251", tone: "info", created_at: ago(1 * HOUR), read_at: ago(50 * MINUTE) },
  ],
  support: [
    { id: "n-u1", title: "Critical ticket", body: "SUP-000415: third flag on AX-001244.", href: "/tickets/t-415", tone: "danger", created_at: ago(12 * MINUTE), read_at: null },
    { id: "n-u2", title: "New quality complaint", body: "SUP-000412 from Priya Nambiar on AX-001240.", href: "/tickets/t-412", tone: "warning", created_at: ago(25 * MINUTE), read_at: null },
  ],
};

/* Supervisor applications (QQD verifies directly, FR-SV-014) --------- */

export const supervisorApplications: SupervisorApplication[] = [
  {
    id: "sa-1", full_name: "Nikhil Chawla", email: "nikhil.c@assignx.in", categories: ["it", "ai"], years_experience: 9,
    background: "Led QA for a payments startup for four years. Reviews code and automation work. Has managed freelancers before.",
    id_checked: true, interview_done: false, submitted_at: ago(1 * DAY), status: "pending", decided_by: null, reason: null,
  },
  {
    id: "sa-2", full_name: "Aditi Rao", email: "aditi.r@assignx.in", categories: ["writing", "marketing"], years_experience: 7,
    background: "Managing editor at a content agency. Runs editorial checks on 40 pieces a week.",
    id_checked: true, interview_done: true, submitted_at: ago(3 * DAY), status: "pending", decided_by: null, reason: null,
  },
  {
    id: "sa-3", full_name: "Karan Mehra", email: "karan.m@assignx.in", categories: ["design"], years_experience: 2,
    background: "Freelance designer.",
    id_checked: false, interview_done: false, submitted_at: ago(6 * DAY), status: "rejected", decided_by: "Meera Krishnan", reason: "Needs at least 5 years reviewing other people's work.",
  },
];
