// src/lib/datetime.ts
var MINUTE = 6e4;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
var dateTime = new Intl.DateTimeFormat(void 0, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit"
});
var dateOnly = new Intl.DateTimeFormat(void 0, { day: "numeric", month: "short", year: "numeric" });
var timeOnly = new Intl.DateTimeFormat(void 0, { hour: "numeric", minute: "2-digit" });

// src/demo/seed.ts
var NOW = Date.now();
var ago = (ms) => new Date(NOW - ms).toISOString();
var ahead = (ms) => new Date(NOW + ms).toISOString();
var operators = [
  { id: "op-meera", full_name: "Meera Krishnan", email: "meera.k@assignx.internal", segment: "qqd", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: true, joined_at: ago(400 * DAY) },
  { id: "op-arjun", full_name: "Arjun Rao", email: "arjun.r@assignx.internal", segment: "qqd", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: false, joined_at: ago(210 * DAY) },
  { id: "op-kabir", full_name: "Kabir Malhotra", email: "kabir.m@assignx.internal", segment: "supervisor", categories: ["design", "creative", "marketing"], on_duty: true, active_project_count: 0, average_rating: 4.8, is_lead: false, joined_at: ago(320 * DAY) },
  { id: "op-ananya", full_name: "Ananya Iyer", email: "ananya.i@assignx.internal", segment: "supervisor", categories: ["it", "ai"], on_duty: true, active_project_count: 3, average_rating: 4.7, is_lead: false, joined_at: ago(290 * DAY) },
  { id: "op-rohan", full_name: "Rohan Verma", email: "rohan.v@assignx.internal", segment: "supervisor", categories: ["writing", "research"], on_duty: true, active_project_count: 5, average_rating: 4.6, is_lead: false, joined_at: ago(260 * DAY) },
  { id: "op-sana", full_name: "Sana Qureshi", email: "sana.q@assignx.internal", segment: "supervisor", categories: ["marketing", "writing"], on_duty: false, active_project_count: 2, average_rating: 4.9, is_lead: false, joined_at: ago(150 * DAY) },
  { id: "op-farhan", full_name: "Farhan Siddiqui", email: "farhan.s@assignx.internal", segment: "supervisor", categories: ["design", "it"], on_duty: true, active_project_count: 1, average_rating: 4.5, is_lead: false, joined_at: ago(60 * DAY) },
  { id: "op-devika", full_name: "Devika Nair", email: "devika.n@assignx.internal", segment: "support", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: false, joined_at: ago(230 * DAY) },
  { id: "op-ishita", full_name: "Ishita Bose", email: "ishita.b@assignx.internal", segment: "support", categories: [], on_duty: true, active_project_count: 0, average_rating: null, is_lead: false, joined_at: ago(90 * DAY) }
];
var DEMO_IDENTITY = { qqd: "op-meera", supervisor: "op-kabir", support: "op-devika" };
var client = (id, display_name, segment, country, currency, projects_count) => ({
  id,
  display_name,
  segment,
  country,
  currency,
  projects_count
});
var clients = {
  lena: client("c-lena", "Lena Hoffmann", "business", "Germany", "EUR", 4),
  marcus: client("c-marcus", "Marcus Bell", "agency", "United Kingdom", "GBP", 11),
  priya: client("c-priya", "Priya Nambiar", "individual", "India", "INR", 2),
  daniel: client("c-daniel", "Daniel Okafor", "business", "Canada", "CAD", 6),
  aisha: client("c-aisha", "Aisha Al Mansoori", "business", "United Arab Emirates", "AED", 3),
  tom: client("c-tom", "Tom Reynolds", "individual", "Australia", "AUD", 1),
  sophie: client("c-sophie", "Sophie Laurent", "agency", "United States", "USD", 14),
  rahul: client("c-rahul", "Rahul Mehta", "business", "India", "INR", 7),
  grace: client("c-grace", "Grace Kim", "individual", "United States", "USD", 2),
  oliver: client("c-oliver", "Oliver Grant", "agency", "United Kingdom", "GBP", 9)
};
var doer = (n, full_name, fields, sub_categories, level, average_rating, projects_completed, active_project_count, availability, worked_with_me, extra = {}) => ({
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
  on_time_rate: projects_completed > 0 ? Math.min(1, 0.82 + n % 7 * 0.025) : null,
  last_active_at: ago(n * 37 % 300 * MINUTE),
  joined_at: ago((40 + n * 3) * DAY),
  status: "active",
  ...extra
});
var doers = [
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
  doer(1024, "Ananya Sen", ["marketing"], ["Influencer marketing"], 1, null, 0, 0, "available", false, { verification_status: "rejected" })
];
var attachmentSeq = 1;
function attachment(kind, filename, opts = {}) {
  const ext = filename.split(".").pop() ?? "";
  const mime = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : ext === "zip" ? "application/zip" : ext === "mp4" ? "video/mp4" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/octet-stream";
  return {
    id: `att-${attachmentSeq++}`,
    kind,
    filename,
    mime_type: mime,
    size_bytes: 12e4 + attachmentSeq * 7919 % 48e5,
    uploaded_by_role: kind === "brief" ? "client" : kind === "deliverable" || kind === "snapshot" || kind === "quality_report" ? "coordinator" : "expert",
    scan_status: "clean",
    client_visible: kind === "brief" || kind === "snapshot",
    created_at: ago(2 * HOUR),
    ...opts
  };
}
function project(seed) {
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
    ...seed
  };
}
var pdSeq = 1;
function assignment(projectId, doerN, discipline, payout, opts = {}) {
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
    payout_status: "pending",
    required_module_id: null,
    ...opts
  };
}
var DEMO_FX_TO_INR = { INR: 1, USD: 84.2, GBP: 107.6, AUD: 55.1, EUR: 91.3, AED: 22.9, CAD: 61.4 };
var inr = (amount, currency) => Math.round(amount * DEMO_FX_TO_INR[currency]);
var projects = [
  /* ---- Awaiting quote: QQD quote queue ---- */
  project({
    id: "p-1284",
    code: "AX-001284",
    client: clients.lena,
    category: "design",
    urgency: "express",
    status: "awaiting_quote",
    title: "Logo and brand kit for a specialty coffee roaster",
    description: "We roast single-origin coffee in Hamburg and are launching a wholesale line. We need a new logo (wordmark plus a small mark for bag stamps), a colour palette, two typefaces, and a one-page brand sheet. Current logo attached for reference: we want to keep the warmth but look less rustic.",
    category_answers: [
      { question: "What do you need designed?", answer: "Logo, colour palette, typography, one-page brand sheet" },
      { question: "Where will it be used?", answer: "Coffee bags, wholesale price list, website, Instagram" },
      { question: "Do you have brand assets already?", answer: "Yes, an old logo (attached)" },
      { question: "Final file formats", answer: "SVG, PNG, PDF, plus editable source" }
    ],
    deadline_utc: ahead(6 * DAY),
    created_at: ago(38 * MINUTE),
    attachments: [attachment("brief", "current-logo.png"), attachment("brief", "bag-dieline.pdf")]
  }),
  project({
    id: "p-1285",
    code: "AX-001285",
    client: clients.daniel,
    category: "it",
    urgency: "urgent",
    status: "awaiting_quote",
    title: "Fix Stripe webhook retries in a Node.js API",
    description: "Our Express API processes Stripe webhooks but duplicate events are creating double subscriptions. We need idempotent handling, proper signature checks, and a short write-up. Repo access will be shared through your workspace.",
    category_answers: [
      { question: "What kind of software work?", answer: "Bug fixing" },
      { question: "Tech stack", answer: "Node.js 20, Express, PostgreSQL, Stripe" },
      { question: "Is there existing code?", answer: "Yes, private GitHub repository" }
    ],
    deadline_utc: ahead(2 * DAY),
    created_at: ago(12 * MINUTE)
  }),
  project({
    id: "p-1286",
    code: "AX-001286",
    client: clients.tom,
    category: "writing",
    urgency: "standard",
    status: "awaiting_quote",
    title: "Six SEO blog posts on home solar financing",
    description: "Six posts of about 1,200 words each for an Australian solar installer's blog. Topics: rebates by state, loan vs lease, payback period, battery add-ons, choosing an installer, and maintenance. Friendly but credible tone.",
    category_answers: [
      { question: "Type of writing", answer: "Blog posts" },
      { question: "Length", answer: "Around 1,200 words each, 6 posts" },
      { question: "Audience", answer: "Australian homeowners considering solar" },
      { question: "Keywords provided?", answer: "Yes, a keyword list per post" }
    ],
    deadline_utc: ahead(10 * DAY),
    created_at: ago(22 * MINUTE),
    attachments: [attachment("brief", "keyword-list.docx")]
  }),
  project({
    id: "p-1287",
    code: "AX-001287",
    client: clients.aisha,
    category: "ai",
    urgency: "standard",
    status: "awaiting_quote",
    title: "WhatsApp lead qualification bot connected to HubSpot",
    description: "We get 200+ property enquiries a week on WhatsApp. We want a bot that asks four qualifying questions in English or Arabic, scores the lead, and creates a HubSpot contact with the answers. Human handover when the lead asks for an agent.",
    category_answers: [
      { question: "What should the automation do?", answer: "Qualify leads on WhatsApp and push to HubSpot" },
      { question: "Tools involved", answer: "WhatsApp Business API, HubSpot" },
      { question: "Languages", answer: "English and Arabic" }
    ],
    deadline_utc: null,
    created_at: ago(5 * MINUTE)
  }),
  project({
    id: "p-1288",
    code: "AX-001288",
    client: clients.marcus,
    category: "research",
    urgency: "standard",
    status: "awaiting_quote",
    title: "Competitor teardown for a B2B invoicing SaaS",
    description: "Our agency client is entering the UK SMB invoicing market. We need a teardown of five competitors: pricing, positioning, onboarding flow, integrations, and review sentiment, with a summary slide of white space opportunities.",
    category_answers: [
      { question: "Type of research", answer: "Competitor analysis" },
      { question: "Deliverable format", answer: "Slide deck plus a source spreadsheet" },
      { question: "Competitors named?", answer: "Yes, five listed in the brief" }
    ],
    deadline_utc: ahead(9 * DAY),
    created_at: ago(51 * MINUTE)
  }),
  project({
    id: "p-1289",
    code: "AX-001289",
    client: clients.aisha,
    category: "other",
    urgency: "express",
    status: "awaiting_quote",
    title: "Translate a 40-page product catalogue into Arabic",
    description: "Furniture catalogue in English, about 9,000 words, mostly product names, dimensions and short descriptions. Needs Arabic translation laid back into the existing InDesign file with right-to-left layout.",
    category_answers: [{ question: "Describe what you need", answer: "English to Arabic translation with layout in InDesign" }],
    deadline_utc: ahead(4 * DAY),
    created_at: ago(3 * MINUTE),
    attachments: [attachment("brief", "catalogue-en.pdf")]
  }),
  /* ---- Awaiting payment ---- */
  project({
    id: "p-1279",
    code: "AX-001279",
    client: clients.marcus,
    category: "creative",
    urgency: "standard",
    status: "awaiting_payment",
    title: "30-second product launch video edit",
    description: "Cut a 30-second launch spot from 14 minutes of supplied footage, with captions, licensed music and a 9:16 version for Reels.",
    quote_amount: 42e3,
    quote_amount_inr: inr(42e3, "GBP"),
    delivery_duration_hours: 72,
    quote_expires_at: ahead(20 * HOUR),
    quote_sent_at: ago(4 * HOUR),
    quote_note: "Includes one 16:9 and one 9:16 export, captions, and licensed music.",
    expected_doer_cost_inr: 165e4,
    qqd_id: "op-meera",
    deadline_utc: ahead(4 * DAY),
    created_at: ago(6 * HOUR)
  }),
  project({
    id: "p-1281",
    code: "AX-001281",
    client: clients.rahul,
    category: "marketing",
    urgency: "express",
    status: "awaiting_payment",
    title: "Google Ads account restructure",
    description: "Restructure a Google Ads account with 14 messy campaigns into a clean themed structure, rewrite ad copy, and set up conversion tracking.",
    quote_amount: 145e4,
    quote_amount_inr: 145e4,
    delivery_duration_hours: 48,
    quote_expires_at: ahead(3 * HOUR),
    quote_sent_at: ago(18 * HOUR),
    expected_doer_cost_inr: 6e5,
    qqd_id: "op-arjun",
    deadline_utc: ahead(2 * DAY + 3 * HOUR),
    created_at: ago(20 * HOUR)
  }),
  /* ---- Paid, awaiting supervisor: QQD assignment queue ---- */
  project({
    id: "p-1276",
    code: "AX-001276",
    client: clients.sophie,
    category: "design",
    urgency: "standard",
    status: "in_progress",
    title: "Pitch deck redesign, 18 slides",
    description: "Redesign an 18-slide Series A deck. Content is final; we need a modern visual system, charts rebuilt, and a Google Slides master.",
    quote_amount: 38e3,
    quote_amount_inr: inr(38e3, "USD"),
    delivery_duration_hours: 96,
    quote_sent_at: ago(1 * DAY),
    expected_doer_cost_inr: 12e5,
    qqd_id: "op-meera",
    paid_at: ago(9 * MINUTE),
    deadline_utc: ahead(5 * DAY),
    created_at: ago(30 * HOUR)
  }),
  project({
    id: "p-1277",
    code: "AX-001277",
    client: clients.priya,
    category: "it",
    urgency: "express",
    status: "in_progress",
    title: "Shopify theme speed optimisation",
    description: "Our Shopify store scores 31 on mobile PageSpeed. Need image, script and app cleanup to reach 70+ without breaking the theme.",
    quote_amount: 18e5,
    quote_amount_inr: 18e5,
    delivery_duration_hours: 48,
    quote_sent_at: ago(5 * HOUR),
    expected_doer_cost_inr: 75e4,
    qqd_id: "op-arjun",
    paid_at: ago(21 * MINUTE),
    deadline_utc: ahead(3 * DAY),
    created_at: ago(7 * HOUR)
  }),
  project({
    id: "p-1278",
    code: "AX-001278",
    client: clients.tom,
    category: "writing",
    urgency: "standard",
    status: "in_progress",
    title: "Website copy for a physiotherapy clinic",
    description: "Five pages of website copy: home, services, about, pricing, contact. Warm, plain-English tone for a Brisbane clinic.",
    quote_amount: 52e3,
    quote_amount_inr: inr(52e3, "AUD"),
    delivery_duration_hours: 72,
    quote_sent_at: ago(1 * DAY),
    expected_doer_cost_inr: 95e4,
    qqd_id: "op-meera",
    paid_at: ago(2 * MINUTE),
    deadline_utc: ahead(6 * DAY),
    created_at: ago(26 * HOUR)
  }),
  /* ---- Supervisor (Kabir): sourcing ---- */
  project({
    id: "p-1270",
    code: "AX-001270",
    client: clients.priya,
    category: "design",
    urgency: "standard",
    status: "in_progress",
    title: "Packaging design for a vegan protein bar, 3 SKUs",
    description: "Wrapper design for three flavours of a vegan protein bar. Dieline supplied. Needs nutrition panel layout, FSSAI-compliant label areas, and print-ready files.",
    category_answers: [
      { question: "What do you need designed?", answer: "Packaging for 3 SKUs" },
      { question: "Final file formats", answer: "Print-ready PDF with bleed, editable AI files" }
    ],
    quote_amount: 165e4,
    quote_amount_inr: 165e4,
    delivery_duration_hours: 120,
    quote_sent_at: ago(1 * DAY),
    expected_doer_cost_inr: 65e4,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(70 * MINUTE),
    supervisor_assigned_at: ago(60 * MINUTE),
    deadline_utc: ahead(7 * DAY),
    created_at: ago(28 * HOUR),
    attachments: [attachment("brief", "bar-dieline.pdf"), attachment("brief", "flavour-notes.docx")]
  }),
  project({
    id: "p-1268",
    code: "AX-001268",
    client: clients.grace,
    category: "creative",
    urgency: "standard",
    status: "in_progress",
    title: "Podcast editing, 4 episodes",
    description: "Edit four 45-minute interview episodes: remove filler, level audio, add intro and outro music (supplied), export MP3 and WAV.",
    quote_amount: 26e3,
    quote_amount_inr: inr(26e3, "USD"),
    delivery_duration_hours: 96,
    quote_sent_at: ago(2 * DAY),
    expected_doer_cost_inr: 8e5,
    qqd_id: "op-arjun",
    supervisor_id: "op-kabir",
    paid_at: ago(5 * HOUR),
    supervisor_assigned_at: ago(4.8 * HOUR),
    failed_offer_count: 2,
    deadline_utc: ahead(6 * DAY),
    created_at: ago(2 * DAY),
    doers: [
      assignment("p-1268", 1008, "creative", 8e5, { status: "declined", accepted_at: null, offered_at: ago(4.6 * HOUR), offer_expires_at: ago(2.6 * HOUR), decline_reason: "At capacity this week" }),
      assignment("p-1268", 1019, "creative", 8e5, { status: "expired", accepted_at: null, offered_at: ago(2.5 * HOUR), offer_expires_at: ago(0.5 * HOUR) })
    ]
  }),
  project({
    id: "p-1272",
    code: "AX-001272",
    client: clients.lena,
    category: "marketing",
    urgency: "standard",
    status: "in_progress",
    title: "Instagram content calendar and 12 post designs",
    description: "A one-month content calendar for our caf\xE9 accounts, with captions and 12 designed posts in our new brand style.",
    quote_amount: 34e3,
    quote_amount_inr: inr(34e3, "EUR"),
    delivery_duration_hours: 120,
    quote_sent_at: ago(2 * DAY),
    expected_doer_cost_inr: 11e5,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(3 * HOUR),
    supervisor_assigned_at: ago(2.8 * HOUR),
    deadline_utc: ahead(8 * DAY),
    created_at: ago(2 * DAY),
    doers: [assignment("p-1272", 1007, "marketing", 115e4, { status: "offered", accepted_at: null, offered_at: ago(40 * MINUTE), offer_expires_at: ahead(80 * MINUTE) })]
  }),
  project({
    id: "p-1266",
    code: "AX-001266",
    client: clients.daniel,
    category: "design",
    urgency: "express",
    status: "in_progress",
    title: "Landing page UI and copy for a fintech waitlist",
    description: "Landing page for a savings app waitlist: hero, three feature blocks, FAQ, signup. Needs the copy written and the UI designed in Figma, desktop and mobile.",
    quote_amount: 72e3,
    quote_amount_inr: inr(72e3, "CAD"),
    delivery_duration_hours: 96,
    quote_sent_at: ago(1 * DAY),
    expected_doer_cost_inr: 19e5,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(6 * HOUR),
    supervisor_assigned_at: ago(5.8 * HOUR),
    deadline_utc: ahead(4 * DAY),
    created_at: ago(1 * DAY),
    doers: [
      assignment("p-1266", 1003, "design", 135e4, { accepted_at: ago(25 * MINUTE), offered_at: ago(1 * HOUR), offer_expires_at: ahead(1 * HOUR), scope_note: "UI design in Figma, desktop and mobile" }),
      assignment("p-1266", 1012, "writing", 55e4, { status: "offered", accepted_at: null, offered_at: ago(15 * MINUTE), offer_expires_at: ahead(105 * MINUTE), scope_note: "All landing page copy and FAQ" })
    ]
  }),
  /* ---- Supervisor (Kabir): work underway ---- */
  project({
    id: "p-1259",
    code: "AX-001259",
    client: clients.oliver,
    category: "design",
    urgency: "standard",
    status: "in_progress",
    title: "Brand guidelines document, 24 pages",
    description: "Turn an approved identity into a 24-page brand guidelines PDF: logo usage, colour, type, imagery, tone of voice, templates.",
    quote_amount: 64e3,
    quote_amount_inr: inr(64e3, "GBP"),
    delivery_duration_hours: 144,
    quote_sent_at: ago(4 * DAY),
    expected_doer_cost_inr: 26e5,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(3 * DAY),
    supervisor_assigned_at: ago(3 * DAY),
    progress_percent: 60,
    progress_label: "Typography and colour system",
    progress_updated_at: ago(6 * HOUR),
    deadline_utc: ahead(3 * DAY),
    created_at: ago(4 * DAY),
    doers: [assignment("p-1259", 1001, "design", 26e5, { working_link: "https://www.figma.com/file/ws-expert-07/brand-guidelines", accepted_at: ago(3 * DAY) })],
    attachments: [attachment("snapshot", "guidelines-progress-1.png", { note: "Logo usage and clear space pages", created_at: ago(1 * DAY) })]
  }),
  project({
    id: "p-1255",
    code: "AX-001255",
    client: clients.grace,
    category: "creative",
    urgency: "express",
    status: "in_progress",
    title: "YouTube thumbnail set, 20 designs",
    description: "Twenty thumbnails for a cooking channel's back catalogue, consistent style, face cutouts from supplied stills, bold readable titles.",
    quote_amount: 22e3,
    quote_amount_inr: inr(22e3, "USD"),
    delivery_duration_hours: 72,
    quote_sent_at: ago(5 * DAY),
    expected_doer_cost_inr: 65e4,
    qqd_id: "op-arjun",
    supervisor_id: "op-kabir",
    paid_at: ago(4 * DAY),
    supervisor_assigned_at: ago(4 * DAY),
    progress_percent: 35,
    progress_label: "First 7 thumbnails drafted",
    progress_updated_at: ago(52 * HOUR),
    flag_count: 1,
    flags: [{ id: "fl-1", reason: "delay", detail: "It has been two days without an update and the deadline is close.", raised_at: ago(40 * MINUTE), resolved_at: null }],
    deadline_utc: ahead(18 * HOUR),
    created_at: ago(5 * DAY),
    doers: [assignment("p-1255", 1011, "creative", 65e4, { working_link: "https://www.canva.com/design/ws-expert-12/thumbnails", accepted_at: ago(4 * DAY) })]
  }),
  project({
    id: "p-1262",
    code: "AX-001262",
    client: clients.sophie,
    category: "marketing",
    urgency: "standard",
    status: "in_progress",
    title: "Email nurture sequence, 7 emails with designs",
    description: "Seven-email onboarding sequence for a project management SaaS trial, with copy, subject line variants and designed templates in Klaviyo.",
    quote_amount: 54e3,
    quote_amount_inr: inr(54e3, "USD"),
    delivery_duration_hours: 120,
    quote_sent_at: ago(4 * DAY),
    expected_doer_cost_inr: 22e5,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(3.5 * DAY),
    supervisor_assigned_at: ago(3.5 * DAY),
    progress_percent: 80,
    progress_label: "Final email designs",
    progress_updated_at: ago(3 * HOUR),
    deadline_utc: ahead(2 * DAY),
    created_at: ago(4 * DAY),
    doers: [assignment("p-1262", 1009, "marketing", 22e5, { working_link: "https://docs.google.com/document/d/ws-expert-03-nurture", accepted_at: ago(3.4 * DAY) })]
  }),
  /* ---- Supervisor (Kabir): QC queue ---- */
  project({
    id: "p-1251",
    code: "AX-001251",
    client: clients.rahul,
    category: "design",
    urgency: "standard",
    status: "in_review",
    title: "Restaurant menu redesign, print and digital",
    description: "Redesign a two-page dine-in menu and a QR digital menu for a Pune restaurant. Keep the existing logo; new layout, icons for veg and non-veg, spice levels.",
    quote_amount: 12e5,
    quote_amount_inr: 12e5,
    delivery_duration_hours: 72,
    quote_sent_at: ago(4 * DAY),
    expected_doer_cost_inr: 48e4,
    qqd_id: "op-arjun",
    supervisor_id: "op-kabir",
    paid_at: ago(3 * DAY),
    supervisor_assigned_at: ago(3 * DAY),
    progress_percent: 100,
    progress_label: "Submitted for final checks",
    progress_updated_at: ago(1 * HOUR),
    updated_at: ago(1 * HOUR),
    deadline_utc: ahead(1 * DAY),
    created_at: ago(4 * DAY),
    doers: [assignment("p-1251", 1004, "design", 48e4, { working_link: "https://www.figma.com/file/ws-expert-04/menu", accepted_at: ago(3 * DAY) })],
    attachments: [
      attachment("revision", "menu-print-v1.pdf", { uploaded_by_role: "expert", created_at: ago(1 * HOUR) }),
      attachment("revision", "menu-digital-v1.png", { uploaded_by_role: "expert", created_at: ago(1 * HOUR) }),
      attachment("revision", "menu-source.zip", { uploaded_by_role: "expert", created_at: ago(1 * HOUR) })
    ]
  }),
  project({
    id: "p-1249",
    code: "AX-001249",
    client: clients.marcus,
    category: "creative",
    urgency: "express",
    status: "in_review",
    title: "Explainer animation, 60 seconds",
    description: "A 60-second 2D explainer for a logistics app, from an approved script and storyboard. Voiceover supplied. Brand colours provided.",
    quote_amount: 68e3,
    quote_amount_inr: inr(68e3, "GBP"),
    delivery_duration_hours: 120,
    quote_sent_at: ago(6 * DAY),
    expected_doer_cost_inr: 3e6,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(5.5 * DAY),
    supervisor_assigned_at: ago(5.5 * DAY),
    revision_count: 1,
    progress_percent: 100,
    progress_label: "Submitted for final checks",
    progress_updated_at: ago(5 * HOUR),
    updated_at: ago(5 * HOUR),
    deadline_utc: ahead(10 * HOUR),
    created_at: ago(6 * DAY),
    qc: { checks: { licensed: true, export: true }, custom_checks: [], notes: "Music licence confirmed. Check audio levels at 0:42.", completed_at: null },
    doers: [assignment("p-1249", 1015, "creative", 3e6, { working_link: "https://drive.google.com/drive/folders/ws-expert-15", accepted_at: ago(5.4 * DAY) })],
    attachments: [
      attachment("revision", "explainer-60s-v2.mp4", { uploaded_by_role: "expert", created_at: ago(5 * HOUR) }),
      attachment("deliverable", "explainer-60s-1080p.mp4", { created_at: ago(2 * HOUR), client_visible: false })
    ]
  }),
  /* ---- Delivered ---- */
  project({
    id: "p-1240",
    code: "AX-001240",
    client: clients.priya,
    category: "design",
    urgency: "standard",
    status: "delivered",
    title: "Event poster series, 5 posters",
    description: "Five posters for a college alumni music night, A3 print and Instagram sizes.",
    quote_amount: 85e4,
    quote_amount_inr: 85e4,
    delivery_duration_hours: 72,
    expected_doer_cost_inr: 3e5,
    qqd_id: "op-arjun",
    supervisor_id: "op-kabir",
    paid_at: ago(6 * DAY),
    supervisor_assigned_at: ago(6 * DAY),
    delivered_at: ago(2 * DAY),
    progress_percent: 100,
    progress_label: "Delivered",
    progress_updated_at: ago(2 * DAY),
    created_at: ago(7 * DAY),
    qc: { checks: { source: true, licensed: true, formats: true, brand: true }, custom_checks: [], notes: "", completed_at: ago(2 * DAY) },
    delivery_note: "All five posters in A3 print PDF and 1080x1350 for Instagram, with editable source files.",
    doers: [assignment("p-1240", 1002, "design", 3e5, { working_link: "https://www.canva.com/design/ws-expert-02/posters", accepted_at: ago(6 * DAY) })],
    attachments: [attachment("deliverable", "posters-print.zip", { created_at: ago(2 * DAY) }), attachment("deliverable", "posters-instagram.zip", { created_at: ago(2 * DAY) })]
  }),
  project({
    id: "p-1231",
    code: "AX-001231",
    client: clients.daniel,
    category: "marketing",
    urgency: "standard",
    status: "delivered",
    title: "SEO audit and prioritised fix list",
    description: "Technical and on-page SEO audit of a 60-page B2B site with a prioritised fix list.",
    quote_amount: 46e3,
    quote_amount_inr: inr(46e3, "CAD"),
    delivery_duration_hours: 96,
    expected_doer_cost_inr: 125e4,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(20 * DAY),
    supervisor_assigned_at: ago(20 * DAY),
    delivered_at: ago(15 * DAY),
    progress_percent: 100,
    progress_label: "Delivered",
    progress_updated_at: ago(15 * DAY),
    created_at: ago(21 * DAY),
    qc: { checks: { goal: true, sources: true, access: true }, custom_checks: [], notes: "", completed_at: ago(15 * DAY) },
    delivery_note: "Audit report, crawl export, and a 42-item fix list ranked by impact.",
    doers: [assignment("p-1231", 1017, "marketing", 125e4, { working_link: "https://docs.google.com/document/d/ws-expert-09-seo", accepted_at: ago(19 * DAY) })],
    attachments: [attachment("deliverable", "seo-audit.pdf", { created_at: ago(15 * DAY) })]
  }),
  /* ---- Completed: QQD disbursement queue ---- */
  project({
    id: "p-1228",
    code: "AX-001228",
    client: clients.sophie,
    category: "design",
    urgency: "standard",
    status: "completed",
    title: "Mobile app icon set, 48 icons",
    description: "A 48-icon line set for a fitness app in three weights, SVG and Figma components.",
    quote_amount: 19e3,
    quote_amount_inr: inr(19e3, "USD"),
    expected_doer_cost_inr: 6e5,
    qqd_id: "op-meera",
    supervisor_id: "op-kabir",
    paid_at: ago(5 * DAY),
    delivered_at: ago(1 * DAY),
    approved_at: ago(3 * HOUR),
    created_at: ago(6 * DAY),
    doers: [assignment("p-1228", 1001, "design", 6e5, { accepted_at: ago(5 * DAY), status: "completed" })]
  }),
  project({
    id: "p-1224",
    code: "AX-001224",
    client: clients.oliver,
    category: "writing",
    urgency: "standard",
    status: "completed",
    title: "Ghostwritten LinkedIn articles, 8 pieces",
    description: "Eight 900-word LinkedIn articles for an agency founder, from recorded interviews.",
    quote_amount: 48e3,
    quote_amount_inr: inr(48e3, "GBP"),
    expected_doer_cost_inr: 17e5,
    qqd_id: "op-arjun",
    supervisor_id: "op-rohan",
    paid_at: ago(9 * DAY),
    delivered_at: ago(2 * DAY),
    approved_at: ago(20 * HOUR),
    created_at: ago(10 * DAY),
    doers: [assignment("p-1224", 1012, "writing", 17e5, { accepted_at: ago(9 * DAY), status: "completed" })]
  }),
  project({
    id: "p-1219",
    code: "AX-001219",
    client: clients.rahul,
    category: "it",
    urgency: "standard",
    status: "completed",
    title: "Shopify to BigQuery data pipeline",
    description: "Daily sync of Shopify orders, customers and products into BigQuery with a Looker Studio starter dashboard.",
    quote_amount: 38e5,
    quote_amount_inr: 38e5,
    expected_doer_cost_inr: 15e5,
    qqd_id: "op-meera",
    supervisor_id: "op-ananya",
    paid_at: ago(12 * DAY),
    delivered_at: ago(3 * DAY),
    approved_at: ago(30 * HOUR),
    created_at: ago(13 * DAY),
    doers: [assignment("p-1219", 1013, "it", 15e5, { accepted_at: ago(12 * DAY), status: "completed", payout_status: "failed" })]
  }),
  project({
    id: "p-1213",
    code: "AX-001213",
    client: clients.grace,
    category: "design",
    urgency: "standard",
    status: "completed",
    title: "Wedding website illustrations",
    description: "Six watercolour-style illustrations for a wedding website.",
    quote_amount: 21e3,
    quote_amount_inr: inr(21e3, "USD"),
    expected_doer_cost_inr: 7e5,
    qqd_id: "op-arjun",
    supervisor_id: "op-kabir",
    paid_at: ago(18 * DAY),
    delivered_at: ago(10 * DAY),
    approved_at: ago(8 * DAY),
    payout_released_at: ago(7 * DAY),
    created_at: ago(19 * DAY),
    doers: [assignment("p-1213", 1002, "design", 7e5, { accepted_at: ago(18 * DAY), status: "completed", payout_status: "released" })]
  }),
  /* ---- Cancelled ---- */
  project({
    id: "p-1215",
    code: "AX-001215",
    client: clients.lena,
    category: "research",
    urgency: "standard",
    status: "cancelled",
    title: "Market sizing for an EV charging startup",
    description: "TAM, SAM and SOM for workplace EV charging in Germany.",
    quote_amount: 41e3,
    quote_amount_inr: inr(41e3, "EUR"),
    qqd_id: "op-meera",
    supervisor_id: "op-rohan",
    paid_at: ago(14 * DAY),
    cancelled_at: ago(9 * DAY),
    cancellation_reason: "refunded",
    created_at: ago(15 * DAY)
  })
];
var msgSeq = 1;
function msg(projectId, at, seed) {
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
    ...seed
  };
}
var sys = (projectId, at, body) => msg(projectId, at, { channel: "client", sender_role: "system", sender_label: "System", body });
var messages = [
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
    channel: "internal",
    sender_role: "expert",
    sender_label: "R-1003",
    sender_id: "d-1003",
    discipline: "design",
    body: "Thanks! Quicker if you add me on telegram, I'm @vik_designs there, I check it more often.",
    state: "held",
    held_reason: "contact_details",
    screen_note: "Shares a messaging handle and invites contact off-platform."
  }),
  // Underway
  sys("p-1259", ago(3 * DAY), "A design expert has been allotted to your project"),
  msg("p-1259", ago(1 * DAY), { channel: "client", sender_role: "coordinator", sender_label: "Kabir Malhotra", sender_id: "op-kabir", body: "Progress snapshot posted: logo usage and clear space pages are done. Typography and colour pages are next.", attachments: [] }),
  msg("p-1259", ago(7 * HOUR), { channel: "client", sender_role: "client", sender_label: "Oliver Grant", sender_id: "c-oliver", body: "Looks sharp. Could the imagery section include do and don't examples?" }),
  msg("p-1259", ago(6.5 * HOUR), { channel: "internal", sender_role: "coordinator", sender_label: "Kabir Malhotra", sender_id: "op-kabir", body: "Client wants do and don't examples in the imagery section. Can you add a spread for that?" }),
  msg("p-1259", ago(6 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1001", sender_id: "d-1001", discipline: "design", body: "Yes, will add two spreads. Typography pages done today." }),
  msg("p-1259", ago(11 * MINUTE), {
    channel: "client",
    sender_role: "expert",
    sender_label: "R-1001",
    sender_id: "d-1001",
    discipline: "design",
    body: "Happy to add those. I studied at NID Ahmedabad so this editorial style is very familiar to me, will share soon.",
    state: "held",
    held_reason: "identity_reveal",
    screen_note: "Names the expert's educational institution."
  }),
  sys("p-1255", ago(4 * DAY), "A media expert has been allotted to your project"),
  msg("p-1255", ago(41 * MINUTE), { channel: "client", sender_role: "client", sender_label: "Grace Kim", sender_id: "c-grace", body: "Hi, it has been two days without an update and the deadline is tomorrow. Are we still on track?" }),
  sys("p-1255", ago(40 * MINUTE), "This project has been escalated"),
  msg("p-1255", ago(30 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1011", sender_id: "d-1011", discipline: "creative", body: "Seven done, working through the rest. Some stills are low resolution, may need to upscale." }),
  sys("p-1262", ago(3.4 * DAY), "A marketing expert has been allotted to your project"),
  msg("p-1262", ago(25 * MINUTE), { channel: "client", sender_role: "client", sender_label: "Sophie Laurent", sender_id: "c-sophie", body: "The welcome email draft reads great. Can we see the designed version before Friday?" }),
  msg("p-1262", ago(6 * MINUTE), {
    channel: "client",
    sender_role: "expert",
    sender_label: "R-1009",
    sender_id: "d-1009",
    discipline: "marketing",
    body: "Sure! If it is easier we can go through the designs on a quick call, my number is nine eight two zero, four one one, seven seven three.",
    state: "held",
    held_reason: "contact_details",
    screen_note: "Phone number written out in words."
  }),
  // Client-side held message
  msg("p-1272", ago(19 * MINUTE), {
    channel: "client",
    sender_role: "client",
    sender_label: "Lena Hoffmann",
    sender_id: "c-lena",
    body: "If the designer has questions about our caf\xE9 photos they can also email me directly at lena dot h at roastco dot de.",
    state: "held",
    held_reason: "contact_details",
    screen_note: "Client shares an obfuscated email address while an expert may join the thread."
  }),
  // QC
  sys("p-1251", ago(1 * HOUR), "Your work is in final checks"),
  msg("p-1251", ago(1 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1004", sender_id: "d-1004", discipline: "design", body: "Submitted. Print PDF has 3mm bleed, digital menu exported at 2x. Source zip has the Figma export and fonts list." }),
  sys("p-1249", ago(5 * HOUR), "Your work is in final checks"),
  msg("p-1249", ago(5 * HOUR), { channel: "internal", sender_role: "expert", sender_label: "R-1015", sender_id: "d-1015", discipline: "creative", body: "v2 uploaded with the revised scene 4 and the new voiceover timing." }),
  // Delivered
  sys("p-1240", ago(2 * DAY), "Your work has been delivered"),
  sys("p-1231", ago(15 * DAY), "Your work has been delivered")
];
var verificationCases = [
  {
    id: "vc-1",
    doer_id: "d-1021",
    doer_code: "R-1021",
    full_name: "Yash Thakur",
    declared_name: "Yash Thakur",
    fields: ["design", "creative"],
    submitted_at: ago(3 * HOUR),
    stage: "document_check",
    documents: [{ kind: "pan", label: "PAN card", legible: null, name_matches: null }, { kind: "photo_id", label: "Aadhaar card", legible: null, name_matches: null }],
    payout_method: "upi",
    payout_name_matches: null,
    assigned_supervisor_id: null,
    rejection_reason: null
  },
  {
    id: "vc-2",
    doer_id: "d-1022",
    doer_code: "R-1022",
    full_name: "Ira Malhotra",
    declared_name: "Ira Malhotra",
    fields: ["writing"],
    submitted_at: ago(9 * HOUR),
    stage: "awaiting_supervisor",
    documents: [{ kind: "pan", label: "PAN card", legible: true, name_matches: true }, { kind: "photo_id", label: "Passport", legible: true, name_matches: true }],
    payout_method: "bank",
    payout_name_matches: true,
    assigned_supervisor_id: null,
    rejection_reason: null
  },
  {
    id: "vc-3",
    doer_id: "d-1023",
    doer_code: "R-1023",
    full_name: "Dhruv Nair",
    declared_name: "Dhruv Nair",
    fields: ["it"],
    submitted_at: ago(1 * DAY),
    stage: "supervisor_call",
    documents: [{ kind: "pan", label: "PAN card", legible: true, name_matches: true }, { kind: "photo_id", label: "Driving licence", legible: true, name_matches: true }],
    payout_method: "bank",
    payout_name_matches: true,
    assigned_supervisor_id: "op-kabir",
    rejection_reason: null
  },
  {
    id: "vc-4",
    doer_id: "d-1024",
    doer_code: "R-1024",
    full_name: "Ananya Sen",
    declared_name: "Ananya Sen",
    fields: ["marketing"],
    submitted_at: ago(3 * DAY),
    stage: "rejected",
    documents: [{ kind: "pan", label: "PAN card", legible: false, name_matches: null }, { kind: "photo_id", label: "Voter ID", legible: true, name_matches: true }],
    payout_method: "upi",
    payout_name_matches: null,
    assigned_supervisor_id: null,
    rejection_reason: "PAN image is blurred. Please upload a clear photo of the full card."
  }
];
var entry = (id, kind, author_label, body, created_at) => ({ id, kind, author_label, body, created_at });
var tickets = [
  {
    id: "t-416",
    reference: "SUP-000416",
    subject: "Do you take on academic essay work?",
    category: "general",
    priority: "low",
    status: "new",
    source: "contact_form",
    owner_id: null,
    project_id: null,
    project_code: null,
    requester: { role: "client", label: "Website visitor" },
    created_at: ago(18 * MINUTE),
    first_response_at: null,
    resolved_at: null,
    resolution: null,
    refund_recommendation: null,
    entries: [entry("te-1", "requester", "Website visitor", "Hi, I need a 3,000 word essay for my MBA course by next week. Can your experts write it?", ago(18 * MINUTE))]
  },
  {
    id: "t-415",
    reference: "SUP-000415",
    subject: "Third flag raised on AX-001244",
    category: "quality_complaint",
    priority: "critical",
    status: "new",
    source: "third_flag",
    owner_id: null,
    project_id: null,
    project_code: "AX-001244",
    requester: { role: "client", label: "Marcus Bell" },
    created_at: ago(12 * MINUTE),
    first_response_at: null,
    resolved_at: null,
    resolution: null,
    refund_recommendation: null,
    entries: [
      entry("te-2", "event", "System", "Automatic escalation: third flag raised (quality). Supervisor Farhan Siddiqui. Project escalated to QQD.", ago(12 * MINUTE)),
      entry("te-3", "requester", "Marcus Bell", "The second revision still has the old pricing table. This is the third time I have had to point it out.", ago(12 * MINUTE))
    ]
  },
  {
    id: "t-412",
    reference: "SUP-000412",
    subject: "Posters use the wrong brand colour",
    category: "quality_complaint",
    priority: "high",
    status: "new",
    source: "project_link",
    owner_id: null,
    project_id: "p-1240",
    project_code: "AX-001240",
    requester: { role: "client", label: "Priya Nambiar" },
    created_at: ago(25 * MINUTE),
    first_response_at: null,
    resolved_at: null,
    resolution: null,
    refund_recommendation: null,
    entries: [entry("te-4", "requester", "Priya Nambiar", "The posters use a purple that is not our alumni association colour. I attached our colour code in the brief. I have not approved yet.", ago(25 * MINUTE))]
  },
  {
    id: "t-409",
    reference: "SUP-000409",
    subject: "Partial refund request for delayed thumbnails",
    category: "refund_request",
    priority: "high",
    status: "in_progress",
    source: "in_app",
    owner_id: "op-devika",
    project_id: "p-1255",
    project_code: "AX-001255",
    requester: { role: "client", label: "Grace Kim" },
    created_at: ago(3 * HOUR),
    first_response_at: ago(2.5 * HOUR),
    resolved_at: null,
    resolution: null,
    refund_recommendation: null,
    entries: [
      entry("te-5", "requester", "Grace Kim", "Given the delay I would like a partial refund. I needed these for a scheduled upload week.", ago(3 * HOUR)),
      entry("te-6", "reply", "Support", "Thanks Grace, I am looking into the timeline with your coordinator and will come back to you today.", ago(2.5 * HOUR)),
      entry("te-7", "internal_note", "Devika Nair", "Progress stale for 52h. Supervisor says doer had low-res stills. Considering 20 percent partial if delivery slips past deadline.", ago(2 * HOUR))
    ]
  },
  {
    id: "t-405",
    reference: "SUP-000405",
    subject: "Payout for AX-001198 not received",
    category: "doer_issue",
    priority: "normal",
    status: "awaiting_internal",
    source: "doer_report",
    owner_id: "op-ishita",
    project_id: null,
    project_code: "AX-001198",
    requester: { role: "doer", label: "R-1015" },
    created_at: ago(1 * DAY),
    first_response_at: ago(20 * HOUR),
    resolved_at: null,
    resolution: null,
    refund_recommendation: null,
    entries: [
      entry("te-8", "requester", "R-1015", "The client approved AX-001198 four days ago but I have not received the payout.", ago(1 * DAY)),
      entry("te-9", "internal_note", "Ishita Bose", "Asked QQD to check the RazorpayX transfer status.", ago(20 * HOUR))
    ]
  },
  {
    id: "t-401",
    reference: "SUP-000401",
    subject: "GST invoice needs company name",
    category: "billing",
    priority: "normal",
    status: "awaiting_requester",
    source: "in_app",
    owner_id: "op-devika",
    project_id: null,
    project_code: "AX-001207",
    requester: { role: "client", label: "Rahul Mehta" },
    created_at: ago(2 * DAY),
    first_response_at: ago(46 * HOUR),
    resolved_at: null,
    resolution: null,
    refund_recommendation: null,
    entries: [
      entry("te-10", "requester", "Rahul Mehta", "Please reissue the invoice with our company name and GSTIN so we can claim input credit.", ago(2 * DAY)),
      entry("te-11", "reply", "Support", "Happy to help. Please share the exact registered company name and GSTIN.", ago(46 * HOUR))
    ]
  },
  {
    id: "t-398",
    reference: "SUP-000398",
    subject: "Cannot download invoice PDF",
    category: "technical",
    priority: "low",
    status: "resolved",
    source: "in_app",
    owner_id: "op-ishita",
    project_id: null,
    project_code: "AX-001190",
    requester: { role: "client", label: "Tom Reynolds" },
    created_at: ago(4 * DAY),
    first_response_at: ago(4 * DAY - 3 * HOUR),
    resolved_at: ago(3 * DAY),
    resolution: "Browser was blocking pop-ups. Shared the direct download steps.",
    refund_recommendation: null,
    entries: [entry("te-12", "requester", "Tom Reynolds", "The invoice button does nothing.", ago(4 * DAY))]
  }
];
var refunds = [
  {
    id: "rf-1",
    ticket_reference: "SUP-000394",
    project: { id: "p-1236", code: "AX-001236", title: "Product photo retouching, 60 images", category: "creative", quote_amount: 36e3, quote_currency: "GBP", quote_amount_inr: inr(36e3, "GBP"), status: "in_progress" },
    kind: "partial",
    amount: 12e3,
    currency: "GBP",
    recommended_by: "Devika Nair",
    recommendation: "Client received 40 of 60 images on time; remaining 20 delivered three days late after two reminders. Recommend refunding one third.",
    liability_decision: "partial",
    approved_at: ago(5 * HOUR),
    status: "awaiting_execution",
    executed_by: null,
    executed_at: null
  },
  {
    id: "rf-2",
    ticket_reference: "SUP-000388",
    project: { id: "p-1215", code: "AX-001215", title: "Market sizing for an EV charging startup", category: "research", quote_amount: 41e3, quote_currency: "EUR", quote_amount_inr: inr(41e3, "EUR"), status: "cancelled" },
    kind: "full",
    amount: 41e3,
    currency: "EUR",
    recommended_by: "Ishita Bose",
    recommendation: "No doer accepted within the window and the client's board date passed. Company process failure, full refund.",
    liability_decision: "company_process",
    approved_at: ago(10 * DAY),
    status: "executed",
    executed_by: "Meera Krishnan",
    executed_at: ago(9 * DAY)
  }
];
var trainingModules = [
  { id: "tm-1", title: "Working in company workspaces", description: "How to use the anonymous workspace identity, where files live, and what never to sign into.", audience: "doer", categories: [], state: "published", has_assessment: true, completion_rate: 0.86, completions: 214, updated_at: ago(20 * DAY) },
  { id: "tm-2", title: "Packaging print production basics", description: "Dielines, bleed, safe zones, CMYK and spot colours, and label compliance areas.", audience: "doer", categories: ["design"], state: "published", has_assessment: true, completion_rate: 0.41, completions: 38, updated_at: ago(12 * DAY) },
  { id: "tm-3", title: "Running quality checks before delivery", description: "Category checklists, originality and AI reports, and writing a delivery note.", audience: "supervisor", categories: [], state: "published", has_assessment: false, completion_rate: 1, completions: 9, updated_at: ago(30 * DAY) },
  { id: "tm-4", title: "Moderating held messages", description: "What counts as contact details and identity reveals, and when legitimate task content is fine.", audience: "both", categories: [], state: "published", has_assessment: true, completion_rate: 0.72, completions: 160, updated_at: ago(8 * DAY) },
  { id: "tm-5", title: "Licensed music and footage for video work", description: "Approved libraries, licence records, and what to attach to QC.", audience: "doer", categories: ["creative"], state: "draft", has_assessment: false, completion_rate: 0, completions: 0, updated_at: ago(2 * DAY) }
];
var BANDS = [
  ["writing", "Short piece (under 1,500 words)", 2500, 4e3, 6500],
  ["writing", "Multi-piece pack (4 to 8 pieces)", 12e3, 2e4, 32e3],
  ["design", "Single asset (logo, poster, icon)", 4e3, 7500, 12e3],
  ["design", "Brand kit or multi-page system", 14e3, 24e3, 4e4],
  ["design", "Packaging, per SKU", 4500, 6500, 9500],
  ["creative", "Short video (under 60s)", 9e3, 15e3, 26e3],
  ["creative", "Audio editing, per episode", 1800, 3e3, 4500],
  ["it", "Bug fix or small feature", 6e3, 12e3, 2e4],
  ["it", "Integration or data pipeline", 2e4, 35e3, 6e4],
  ["ai", "Single workflow automation", 1e4, 18e3, 3e4],
  ["ai", "Conversational agent with integrations", 25e3, 45e3, 8e4],
  ["marketing", "Audit or restructure", 8e3, 14e3, 24e3],
  ["marketing", "Campaign or content set", 1e4, 18e3, 3e4],
  ["research", "Single report", 8e3, 15e3, 25e3],
  ["research", "Competitor or market teardown", 15e3, 26e3, 42e3]
];
var rateBands = BANDS.flatMap(
  ([category, scope_band, low, typical, high], i) => ["INR", "USD", "GBP", "EUR", "AUD", "AED", "CAD"].map((currency) => {
    const k = DEMO_FX_TO_INR[currency];
    const conv = (v) => currency === "INR" ? v * 100 : Math.round(v / k * 1.25) * 100;
    return { id: `rb-${i}-${currency}`, category, scope_band, currency, low: conv(low), typical: conv(typical), high: conv(high) };
  })
);
var ledger = [
  { id: "lg-1", type: "payment_captured", project_code: "AX-001278", amount: 52e3, currency: "AUD", inr_equivalent: inr(52e3, "AUD"), fx_rate: DEMO_FX_TO_INR.AUD, actor: "Razorpay webhook", provider_ref: "pay_demo_9KQ2", created_at: ago(2 * MINUTE) },
  { id: "lg-2", type: "payment_captured", project_code: "AX-001276", amount: 38e3, currency: "USD", inr_equivalent: inr(38e3, "USD"), fx_rate: DEMO_FX_TO_INR.USD, actor: "Razorpay webhook", provider_ref: "pay_demo_9KP7", created_at: ago(9 * MINUTE) },
  { id: "lg-3", type: "payment_captured", project_code: "AX-001277", amount: 18e5, currency: "INR", inr_equivalent: 18e5, fx_rate: 1, actor: "Razorpay webhook", provider_ref: "pay_demo_9KN1", created_at: ago(21 * MINUTE) },
  { id: "lg-4", type: "payout_executed", project_code: "AX-001213", amount: 7e5, currency: "INR", inr_equivalent: 7e5, fx_rate: null, actor: "Arjun Rao", provider_ref: "pout_demo_4H2", created_at: ago(7 * DAY) },
  { id: "lg-5", type: "reserve_held", project_code: "AX-001213", amount: 106700, currency: "INR", inr_equivalent: 106700, fx_rate: null, actor: "System", provider_ref: null, created_at: ago(7 * DAY) },
  { id: "lg-6", type: "refund_executed", project_code: "AX-001215", amount: 41e3, currency: "EUR", inr_equivalent: inr(41e3, "EUR"), fx_rate: DEMO_FX_TO_INR.EUR, actor: "Meera Krishnan", provider_ref: "rfnd_demo_2B9", created_at: ago(9 * DAY) },
  { id: "lg-7", type: "credits_applied", project_code: "AX-001270", amount: 0, currency: "INR", inr_equivalent: 0, fx_rate: null, actor: "Client", provider_ref: null, created_at: ago(70 * MINUTE) }
];
var evSeq = 1;
var ev = (kind, project_code, text, actor_label, at) => ({
  id: `ev-${evSeq++}`,
  project_id: project_code ? `p-${project_code.slice(-4)}` : null,
  project_code,
  kind,
  text,
  actor_label,
  created_at: at
});
var activity = [
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
  ev("submitted_for_review", "AX-001249", "R-1015 submitted v2 for final checks", "R-1015", ago(5 * HOUR))
];
var notifications = {
  qqd: [
    { id: "n-q1", title: "Quote queue breach", body: "AX-001288 has waited 51 minutes and was escalated to the QQD lead.", href: "/quotes/p-1288", tone: "danger", created_at: ago(6 * MINUTE), read_at: null },
    { id: "n-q2", title: "Assignment overdue", body: "AX-001277 has been paid for 21 minutes without a supervisor.", href: "/assignment", tone: "warning", created_at: ago(6 * MINUTE), read_at: null },
    { id: "n-q3", title: "Payout failed", body: "AX-001219 transfer to R-1013 failed: beneficiary name mismatch.", href: "/disbursement", tone: "danger", created_at: ago(5 * HOUR), read_at: null },
    { id: "n-q4", title: "Refund approved by Support", body: "SUP-000394 partial refund for AX-001236 is ready to execute.", href: "/refunds", tone: "info", created_at: ago(5 * HOUR), read_at: ago(4 * HOUR) }
  ],
  supervisor: [
    { id: "n-s1", title: "Message held", body: "R-1003 shared a messaging handle in the internal thread of AX-001266.", href: "/moderation", tone: "warning", created_at: ago(2 * MINUTE), read_at: null },
    { id: "n-s2", title: "Flag raised: respond within 2 hours", body: "Grace Kim flagged AX-001255 for delay.", href: "/projects/p-1255", tone: "danger", created_at: ago(40 * MINUTE), read_at: null },
    { id: "n-s3", title: "New project assigned", body: "AX-001270 packaging design was assigned to you.", href: "/projects/p-1270", tone: "info", created_at: ago(60 * MINUTE), read_at: null },
    { id: "n-s4", title: "Work submitted", body: "R-1004 submitted AX-001251 for final checks.", href: "/qc/p-1251", tone: "info", created_at: ago(1 * HOUR), read_at: ago(50 * MINUTE) }
  ],
  support: [
    { id: "n-u1", title: "Critical ticket", body: "SUP-000415: third flag on AX-001244.", href: "/tickets/t-415", tone: "danger", created_at: ago(12 * MINUTE), read_at: null },
    { id: "n-u2", title: "New quality complaint", body: "SUP-000412 from Priya Nambiar on AX-001240.", href: "/tickets/t-412", tone: "warning", created_at: ago(25 * MINUTE), read_at: null }
  ]
};

// src/lib/money.ts
function toMinor(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
var LOCALE = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  AUD: "en-AU",
  EUR: "en-IE",
  AED: "en-AE",
  CAD: "en-CA"
};
var formatters = /* @__PURE__ */ new Map();
function formatter(currency, precise) {
  const key = `${currency}:${precise ? 2 : 0}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE[currency], {
      style: "currency",
      currency,
      minimumFractionDigits: precise ? 2 : 0,
      maximumFractionDigits: precise ? 2 : 0
    });
    formatters.set(key, fmt);
  }
  return fmt;
}
function formatMoney(amount, currency = "INR", opts) {
  const value = toMinor(amount);
  const precise = opts?.precise || value % 100 !== 0;
  return formatter(currency, precise).format(value / 100);
}
function formatInr(paise, opts) {
  return formatMoney(paise, "INR", opts);
}
function percentOf(amount, percent) {
  return Math.floor(amount * percent / 100);
}

// src/lib/config.ts
var CATEGORIES = {
  writing: { label: "Writing & Content", short: "Writing", expert: "Writing Expert" },
  design: { label: "Design", short: "Design", expert: "Design Expert" },
  creative: { label: "Creative & Media", short: "Media", expert: "Media Expert" },
  it: { label: "IT & Software", short: "Software", expert: "Development Expert" },
  ai: { label: "AI Agents & Automations", short: "Automation", expert: "Automation Expert" },
  marketing: { label: "Marketing", short: "Marketing", expert: "Marketing Expert" },
  research: { label: "Research & Business", short: "Research", expert: "Research Expert" },
  other: { label: "Something Else", short: "Other", expert: "Expert" }
};
var CATEGORY_SLUGS = Object.keys(CATEGORIES);
var SLA = {
  quote: { target: 30 * MINUTE, escalate: 45 * MINUTE },
  assignment: { target: 15 * MINUTE, escalate: 30 * MINUTE },
  sourcing: { target: 2 * HOUR, escalate: 4 * HOUR },
  qc: { target: 4 * HOUR, escalate: 8 * HOUR },
  moderation: { target: 15 * MINUTE, escalate: 30 * MINUTE },
  disbursement: { target: 24 * HOUR, escalate: 36 * HOUR },
  offerExpiry: 2 * HOUR,
  progressStale: 48 * HOUR,
  silentRelease: 14 * 24 * HOUR,
  firstFlagResponse: 2 * HOUR
};
var DOER_CONCURRENCY_CAP = 3;
var OPEN_POOL_AFTER_FAILED_OFFERS = 2;
var QUOTE_NOTE_MAX = 500;
var TDS_RATE_PERCENT = 10;
var TDS_THRESHOLD_INR = 3e6;
var RESERVE_PERCENT_OF_MARGIN = 10;
var QC_CHECKLISTS = {
  writing: [
    { id: "brief", label: "Brief coverage" },
    { id: "report", label: "Originality and AI report attached" },
    { id: "facts", label: "Factual accuracy" },
    { id: "tone", label: "Tone match" },
    { id: "format", label: "Formatting" }
  ],
  design: [
    { id: "source", label: "Editable source files present" },
    { id: "licensed", label: "Licensed assets only" },
    { id: "formats", label: "Required formats and resolutions" },
    { id: "brand", label: "Brand consistency" }
  ],
  creative: [
    { id: "licensed", label: "Licensed music and footage" },
    { id: "export", label: "Export quality" },
    { id: "aspect", label: "Format and aspect ratio" },
    { id: "audio", label: "Audio levels" }
  ],
  it: [
    { id: "tested", label: "Functionality tested" },
    { id: "review", label: "Code reviewed" },
    { id: "security", label: "Basic security checks" },
    { id: "handover", label: "Documentation and handover" }
  ],
  ai: [
    { id: "e2e", label: "End-to-end run tested" },
    { id: "credentials", label: "Credentials handled safely" },
    { id: "errors", label: "Error handling present" },
    { id: "handover", label: "Handover documentation" }
  ],
  marketing: [
    { id: "goal", label: "Deliverables match the stated goal" },
    { id: "sources", label: "Data sources verified" },
    { id: "access", label: "Account access returned" }
  ],
  research: [
    { id: "sources", label: "Sources verified" },
    { id: "accuracy", label: "Data accuracy" },
    { id: "originality", label: "Originality report where prose" },
    { id: "conclusions", label: "Conclusions supported" }
  ],
  other: []
};
var TICKET_PRIORITY = {
  critical: { label: "Critical", tone: "danger", firstResponse: 30 * MINUTE, resolution: 4 * HOUR, rank: 0 },
  high: { label: "High", tone: "warning", firstResponse: 2 * HOUR, resolution: 24 * HOUR, rank: 1 },
  normal: { label: "Normal", tone: "info", firstResponse: 8 * HOUR, resolution: 72 * HOUR, rank: 2 },
  low: { label: "Low", tone: "neutral", firstResponse: 24 * HOUR, resolution: 7 * 24 * HOUR, rank: 3 }
};

// src/lib/user-error.ts
function portalError(message) {
  return new Error(`PORTAL: ${message}`);
}

// src/lib/input-safety.ts
var HIDDEN_RANGES = [
  [0, 8],
  [11, 12],
  [14, 31],
  [127, 127],
  [8203, 8203],
  [8206, 8207],
  [8234, 8238],
  [8288, 8292],
  [8294, 8297],
  [65279, 65279]
];
var HIDDEN_CHARS = new RegExp(
  `[${HIDDEN_RANGES.map(([from, to]) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`).join("")}]`,
  "g"
);
function cleanText(value, max) {
  return value.normalize("NFC").replace(HIDDEN_CHARS, "").slice(0, max);
}
var MB = 1024 * 1024;
var SNAPSHOT_POLICY = { label: "snapshot", allowed: ["jpeg", "png", "webp"], maxBytes: 15 * MB };
var DELIVERABLE_POLICY = {
  label: "deliverable",
  allowed: ["jpeg", "png", "webp", "gif", "pdf", "zip", "mp4", "mov", "mp3", "wav", "text"],
  maxBytes: 200 * MB,
  textExtensions: /\.(txt|csv|md|json)$/i
};
var REPORT_POLICY = { label: "report", allowed: ["pdf"], maxBytes: 25 * MB };
var CHAT_POLICY = { ...DELIVERABLE_POLICY, label: "attachment", maxBytes: 25 * MB };

// src/lib/safe-url.ts
var WORKSPACE_HOSTS = [
  "figma.com",
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
  "slides.google.com",
  "canva.com",
  "github.com",
  "gitlab.com",
  "notion.so",
  "miro.com",
  "frame.io",
  "dropbox.com",
  "onedrive.live.com",
  "sharepoint.com"
];
function checkWorkspaceUrl(raw) {
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Enter a full workspace URL starting with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "Workspace links must use https." };
  if (url.username || url.password) return { ok: false, reason: "Remove the username or password from the link." };
  if (url.port) return { ok: false, reason: "Workspace links cannot use a custom port." };
  const host = url.hostname.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || !host.includes(".") || host.endsWith(".internal") || host.endsWith(".local") || host === "localhost") {
    return { ok: false, reason: "Use the workspace provider's public address." };
  }
  const allowed = WORKSPACE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) return { ok: false, reason: `That host is not an approved company workspace. Approved: ${WORKSPACE_HOSTS.slice(0, 6).join(", ")} and similar.` };
  return { ok: true, url: url.toString(), host };
}

// src/demo/db.ts
var clone = (value) => structuredClone(value);
var state = {
  operators: clone(operators),
  projects: clone(projects),
  messages: clone(messages),
  doers: clone(doers),
  tickets: clone(tickets),
  verification: clone(verificationCases),
  refunds: clone(refunds),
  training: clone(trainingModules),
  rateBands: clone(rateBands),
  ledger: clone(ledger),
  activity: clone(activity),
  notifications: clone(notifications),
  payouts: /* @__PURE__ */ new Map(),
  /** Cumulative FY payouts per doer, for TDS (BR-025). */
  fyPaid: new Map(doers.map((d, i) => [d.id, i * 7919 % 9 * 4e5]))
};
for (const p of state.projects) {
  for (const pd of p.doers) {
    if (pd.payout_status === "failed") {
      state.payouts.set(pd.id, { status: "failed", failure_reason: "Beneficiary name does not match the name on the PAN", executed_by: "Meera Krishnan", executed_at: ago(5 * HOUR), provider_ref: "pout_demo_FAIL1" });
    }
    if (pd.payout_status === "released") {
      state.payouts.set(pd.id, { status: "paid", failure_reason: null, executed_by: "Arjun Rao", executed_at: ago(7 * 24 * HOUR), provider_ref: "pout_demo_4H2" });
    }
  }
}
var seq = 1e3;
var nextId = (prefix) => `${prefix}-${++seq}`;
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
function operator(id) {
  return id ? state.operators.find((o) => o.id === id) : void 0;
}
function opName(id) {
  return operator(id)?.full_name ?? "Operator";
}
function mustProject(id) {
  const p = state.projects.find((x) => x.id === id);
  if (!p) throw portalError("That project no longer exists.");
  return p;
}
function touch(p) {
  p.updated_at = nowIso();
}
function assertSupervisorOwns(p, actorId) {
  const op = operator(actorId);
  if (op?.segment !== "supervisor" || p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can do this.");
}
function assertCanModerate(p, actorId) {
  const op = operator(actorId);
  if (!op) throw portalError("Sign in again.");
  if (op.segment === "supervisor" && p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor, Support or QQD can moderate this.");
}
function log(kind, p, text, actor) {
  state.activity.unshift({ id: nextId("ev"), project_id: p?.id ?? null, project_code: p?.code ?? null, kind, text, actor_label: actor, created_at: nowIso() });
}
function systemMessage(p, body) {
  state.messages.push({
    id: nextId("m"),
    project_id: p.id,
    channel: "client",
    sender_role: "system",
    sender_label: "System",
    sender_id: null,
    discipline: null,
    body,
    state: "delivered",
    held_reason: null,
    screen_note: null,
    moderated_by: null,
    moderated_at: null,
    created_at: nowIso(),
    attachments: []
  });
}
function notify(segment, title, body, href, tone) {
  state.notifications[segment].unshift({ id: nextId("n"), title, body, href, tone, created_at: nowIso(), read_at: null });
}
function refreshHeldCounts() {
  for (const p of state.projects) p.held_count = state.messages.filter((m) => m.project_id === p.id && m.state === "held").length;
}
refreshHeldCounts();
function recountSupervisorLoad() {
  for (const op of state.operators) {
    if (op.segment !== "supervisor") continue;
    const own = state.projects.filter((p) => p.supervisor_id === op.id && (p.status === "in_progress" || p.status === "in_review")).length;
    const base = operators.find((o) => o.id === op.id)?.active_project_count ?? 0;
    op.active_project_count = op.id === "op-kabir" ? own : base + own;
  }
}
recountSupervisorLoad();
function sweepOffers() {
  const now = Date.now();
  for (const p of state.projects) {
    for (const pd of p.doers) {
      if (pd.status === "offered" && new Date(pd.offer_expires_at).getTime() < now) {
        pd.status = "expired";
        p.failed_offer_count += 1;
        log("offer_declined", p, `Offer to ${pd.doer_code} expired`, "System");
      }
    }
  }
}
var isActiveDoer = (pd) => pd.status === "accepted" || pd.status === "completed";
var read = {
  operators: () => {
    recountSupervisorLoad();
    return clone(state.operators);
  },
  projects: () => {
    sweepOffers();
    refreshHeldCounts();
    return clone(state.projects);
  },
  project: (id) => {
    sweepOffers();
    refreshHeldCounts();
    return clone(mustProject(id));
  },
  messages: (projectId, channel) => clone(
    state.messages.filter((m) => m.project_id === projectId && m.channel === channel).sort((a, b) => a.created_at.localeCompare(b.created_at))
  ),
  held: () => {
    const held = state.messages.filter((m) => m.state === "held").sort((a, b) => a.created_at.localeCompare(b.created_at));
    return clone(
      held.map((message) => {
        const p = mustProject(message.project_id);
        const thread = state.messages.filter((m) => m.project_id === p.id && m.channel === message.channel && m.created_at < message.created_at && m.state !== "removed").sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { message, project: { id: p.id, code: p.code, title: p.title, category: p.category, status: p.status }, context: thread.slice(-5) };
      })
    );
  },
  doers: () => clone(state.doers),
  doer: (id) => {
    const d = state.doers.find((x) => x.id === id);
    if (!d) throw portalError("That doer was not found.");
    return clone(d);
  },
  doerProjects: (doerId) => clone(state.projects.filter((p) => p.doers.some((pd) => pd.doer_id === doerId && pd.status !== "declined" && pd.status !== "expired"))),
  tickets: () => clone(state.tickets),
  ticket: (id) => {
    const t = state.tickets.find((x) => x.id === id);
    if (!t) throw portalError("That ticket was not found.");
    return clone(t);
  },
  verification: () => clone(state.verification),
  refunds: () => clone(state.refunds),
  training: () => clone(state.training),
  rateBands: () => clone(state.rateBands),
  ledger: () => clone(state.ledger),
  activity: () => clone(state.activity.slice(0, 60)),
  notifications: (segment) => clone(state.notifications[segment]),
  disbursements: () => {
    const items = [];
    for (const p of state.projects) {
      if (p.status !== "completed" && !(p.status === "delivered" && p.payout_released_at)) continue;
      const lines = p.doers.filter(isActiveDoer).map((pd) => line(p, pd));
      if (lines.every((l) => l.status === "paid") && p.payout_released_at && p.status === "completed" && p.approved_at && Date.now() - new Date(p.approved_at).getTime() > 2 * 24 * HOUR) continue;
      const gross = lines.reduce((sum, l) => sum + l.gross_inr, 0);
      const margin = (p.quote_amount_inr ?? 0) - p.credits_applied_inr - gross;
      items.push({
        project: { id: p.id, code: p.code, title: p.title, category: p.category, quote_amount: p.quote_amount, quote_currency: p.quote_currency, quote_amount_inr: p.quote_amount_inr, credits_applied_inr: p.credits_applied_inr },
        trigger: p.status === "completed" ? "client_approved" : "silent_release",
        triggered_at: (p.status === "completed" ? p.approved_at : p.payout_released_at) ?? p.updated_at,
        lines,
        margin_inr: margin,
        reserve_inr: Math.max(0, percentOf(margin, RESERVE_PERCENT_OF_MARGIN))
      });
    }
    return clone(items.sort((a, b) => a.triggered_at.localeCompare(b.triggered_at)));
  }
};
function computeTds(fyBefore, gross) {
  const after = fyBefore + gross;
  if (after <= TDS_THRESHOLD_INR) return 0;
  if (fyBefore > TDS_THRESHOLD_INR) return percentOf(gross, TDS_RATE_PERCENT);
  return percentOf(after, TDS_RATE_PERCENT);
}
function line(_project, pd) {
  const ps = state.payouts.get(pd.id);
  const fyBefore = state.fyPaid.get(pd.doer_id) ?? 0;
  let gross = pd.payout_amount_inr;
  if (pd.liability_decision === "at_fault") gross = 0;
  const tds = computeTds(fyBefore, gross);
  return {
    project_doer_id: pd.id,
    doer_code: pd.doer_code,
    discipline: pd.discipline,
    gross_inr: gross,
    fy_paid_before_inr: fyBefore,
    tds_inr: tds,
    net_inr: gross - tds,
    liability_decision: pd.liability_decision,
    status: ps?.status ?? (gross === 0 ? "withheld" : "queued"),
    failure_reason: ps?.failure_reason ?? null,
    executed_by: ps?.executed_by ?? null,
    executed_at: ps?.executed_at ?? null,
    provider_ref: ps?.provider_ref ?? null
  };
}
function computeQuoteExpiry(deadlineUtc, durationHours) {
  if (!deadlineUtc) return null;
  return new Date(new Date(deadlineUtc).getTime() - durationHours * HOUR).toISOString();
}
function sendQuote(projectId, input, actorId) {
  const p = mustProject(projectId);
  if (p.status !== "awaiting_quote") throw portalError("This project is no longer awaiting a quote.");
  if (input.amount <= 0) throw portalError("Enter a quote amount above zero.");
  if (input.currency !== p.client.currency) throw portalError(`Quotes for this client are in ${p.client.currency}.`);
  if (input.delivery_duration_hours <= 0) throw portalError("Enter a delivery duration.");
  if (input.note.length > QUOTE_NOTE_MAX) throw portalError(`Keep the coordinator note under ${QUOTE_NOTE_MAX} characters.`);
  const expiry = computeQuoteExpiry(p.deadline_utc, input.delivery_duration_hours);
  if (expiry && new Date(expiry).getTime() <= Date.now()) {
    throw portalError("The client's deadline cannot be met with this delivery duration. Shorten the duration or message the client first.");
  }
  const amountInr = Math.round(input.amount * DEMO_FX_TO_INR[input.currency]);
  p.quote_amount = input.amount;
  p.quote_currency = input.currency;
  p.quote_amount_inr = amountInr;
  p.quote_note = input.note.trim() || null;
  p.delivery_duration_hours = input.delivery_duration_hours;
  p.quote_expires_at = expiry;
  p.quote_sent_at = nowIso();
  p.expected_doer_cost_inr = input.expected_doer_cost_inr;
  p.margin_inr = amountInr - input.expected_doer_cost_inr;
  p.qqd_id = actorId;
  p.status = "awaiting_payment";
  touch(p);
  systemMessage(p, "A quote has been sent");
  log("quoted", p, `Quote sent: ${input.currency} ${(input.amount / 100).toLocaleString()}`, opName(actorId));
}
function simulatePayment(projectId) {
  const p = mustProject(projectId);
  if (p.status !== "awaiting_payment") throw portalError("Only a quoted project can be paid.");
  p.status = "in_progress";
  p.paid_at = nowIso();
  touch(p);
  systemMessage(p, "Payment confirmed");
  state.ledger.unshift({
    id: nextId("lg"),
    type: "payment_captured",
    project_code: p.code,
    amount: p.quote_amount ?? 0,
    currency: p.quote_currency,
    inr_equivalent: p.quote_amount_inr ?? 0,
    fx_rate: DEMO_FX_TO_INR[p.quote_currency],
    actor: "Razorpay webhook",
    provider_ref: `pay_demo_${p.code.slice(-4)}`,
    created_at: nowIso()
  });
  log("paid", p, "Payment captured, entered assignment queue", "Razorpay");
  notify("qqd", "Payment captured", `${p.code} is paid and needs a supervisor within 15 minutes.`, "/assignment", "info");
}
function assignSupervisor(projectId, supervisorId, actorId) {
  const p = mustProject(projectId);
  if (p.status !== "in_progress" || !p.paid_at) throw portalError("Only paid projects can be assigned.");
  if (p.supervisor_id) throw portalError("This project already has a supervisor.");
  const sup = operator(supervisorId);
  if (!sup || sup.segment !== "supervisor") throw portalError("Choose a supervisor.");
  p.supervisor_id = supervisorId;
  p.supervisor_assigned_at = nowIso();
  touch(p);
  recountSupervisorLoad();
  log("supervisor_assigned", p, `Assigned to ${sup.full_name}`, opName(actorId));
  if (supervisorId === DEMO_IDENTITY.supervisor) {
    notify("supervisor", "New project assigned", `${p.code} ${p.title} was assigned to you.`, `/projects/${p.id}`, "info");
  }
}
function sendOffer(projectId, input, actorId) {
  sweepOffers();
  const p = mustProject(projectId);
  if (p.status !== "in_progress" || !p.paid_at) throw portalError("Offers can only be sent on paid, in-progress projects.");
  if (p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can source this project.");
  const d = state.doers.find((x) => x.id === input.doer_id);
  if (!d) throw portalError("That doer was not found.");
  if (d.verification_status !== "verified") throw portalError(`${d.doer_code} is not verified yet and cannot receive offers.`);
  if (d.status !== "active") throw portalError(`${d.doer_code} is suspended.`);
  if (d.active_project_count >= DOER_CONCURRENCY_CAP) throw portalError(`${d.doer_code} already holds ${DOER_CONCURRENCY_CAP} active projects.`);
  if (p.doers.some((pd) => pd.doer_id === d.id && (pd.status === "offered" || isActiveDoer(pd)))) throw portalError(`${d.doer_code} is already on this project.`);
  if (!input.as_additional_part && p.doers.some((pd) => pd.status === "offered" && pd.discipline === input.discipline)) {
    throw portalError("An offer for this part is still open. Withdraw it or wait for it to expire.");
  }
  if (input.payout_amount_inr <= 0) throw portalError("Set a payout amount.");
  const now = Date.now();
  p.doers.push({
    id: nextId("pd"),
    project_id: p.id,
    doer_id: d.id,
    doer_code: d.doer_code,
    discipline: input.discipline,
    payout_amount_inr: input.payout_amount_inr,
    scope_note: input.scope_note.trim() || null,
    working_link: null,
    offered_at: new Date(now).toISOString(),
    offer_expires_at: new Date(now + SLA.offerExpiry).toISOString(),
    accepted_at: null,
    status: "offered",
    decline_reason: null,
    liability_decision: null,
    payout_status: "pending",
    required_module_id: input.required_module_id
  });
  touch(p);
  log("offer_sent", p, `Offer sent to ${d.doer_code}: ${formatInr(input.payout_amount_inr)}`, opName(actorId));
}
function simulateOfferResponse(projectDoerId, accept) {
  const p = state.projects.find((x) => x.doers.some((pd2) => pd2.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That offer was not found.");
  if (pd.status !== "offered") throw portalError("This offer is no longer open.");
  const d = state.doers.find((x) => x.id === pd.doer_id);
  if (accept) {
    if (d && d.active_project_count >= DOER_CONCURRENCY_CAP) throw portalError("The doer is at the three-project cap.");
    pd.status = "accepted";
    pd.accepted_at = nowIso();
    if (d) d.active_project_count += 1;
    const label = CATEGORIES[pd.discipline].expert.toLowerCase();
    const already = p.doers.filter(isActiveDoer).length > 1;
    systemMessage(p, already ? `A ${label} has joined your project` : `A ${label} has been allotted to your project`);
    log("offer_accepted", p, `${pd.doer_code} accepted`, pd.doer_code);
    notify("supervisor", "Offer accepted", `${pd.doer_code} accepted ${p.code}. Set the working link so they can start.`, `/projects/${p.id}`, "success");
  } else {
    pd.status = "declined";
    pd.decline_reason = "Not available for this deadline";
    p.failed_offer_count += 1;
    log("offer_declined", p, `${pd.doer_code} declined`, pd.doer_code);
    notify("supervisor", "Offer declined", `${pd.doer_code} declined ${p.code}.`, `/projects/${p.id}`, "warning");
  }
  touch(p);
}
function setWorkingLink(projectDoerId, url, actorId) {
  const p = state.projects.find((x) => x.doers.some((pd2) => pd2.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That assignment was not found.");
  assertSupervisorOwns(p, actorId);
  if (!isActiveDoer(pd)) throw portalError("Set the working link after the doer accepts.");
  const check = checkWorkspaceUrl(url);
  if (!check.ok) throw portalError(check.reason);
  pd.working_link = check.url;
  touch(p);
  log("working_link_set", p, `Working link set for ${pd.doer_code}`, opName(actorId));
  state.messages.push({
    id: nextId("m"),
    project_id: p.id,
    channel: "internal",
    sender_role: "coordinator",
    sender_label: opName(actorId),
    sender_id: actorId,
    discipline: null,
    body: "Your company workspace is ready. Open it from the project page; work only inside this workspace.",
    state: "delivered",
    held_reason: null,
    screen_note: null,
    moderated_by: null,
    moderated_at: null,
    created_at: nowIso(),
    attachments: []
  });
}
function updateProgress(projectId, percent, label, actorId) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  label = cleanText(label, 80);
  if (p.status !== "in_progress") throw portalError("Progress can only be updated while work is in progress.");
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw portalError("Progress must be a whole number from 0 to 100.");
  if (!label.trim()) throw portalError("Add a short stage label the client will see.");
  p.progress_percent = percent;
  p.progress_label = label.trim().slice(0, 80);
  p.progress_updated_at = nowIso();
  touch(p);
  log("progress", p, `Progress ${percent}%: ${p.progress_label}`, opName(actorId));
}
function moderate(messageId, decision, actorId) {
  const m = state.messages.find((x) => x.id === messageId);
  if (!m) throw portalError("That message was not found.");
  if (m.state !== "held") throw portalError("This message was already decided.");
  const p = mustProject(m.project_id);
  assertCanModerate(p, actorId);
  m.state = decision === "approve" ? "approved" : "removed";
  m.moderated_by = actorId;
  m.moderated_at = nowIso();
  refreshHeldCounts();
  log("moderated", p, `${decision === "approve" ? "Approved" : "Removed"} held message from ${m.sender_label}`, opName(actorId));
}
function saveQc(projectId, qc, actorId) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  if (p.status !== "in_review") throw portalError("QC is recorded while the project is in review.");
  const clean = { ...qc, notes: cleanText(qc.notes, 2e3), custom_checks: qc.custom_checks.map((c) => ({ ...c, label: cleanText(c.label, 120) })) };
  p.qc = { ...clean, completed_at: qcComplete(p.category, clean) ? nowIso() : null };
  touch(p);
}
function qcComplete(category, qc) {
  if (!qc) return false;
  const items = QC_CHECKLISTS[category];
  if (category === "other") return qc.custom_checks.length > 0 && qc.custom_checks.every((c) => c.done);
  return items.every((item) => qc.checks[item.id]) && qc.custom_checks.every((c) => c.done);
}
function addDeliverable(projectId, filename, kind, actorId) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  if (p.status !== "in_review") throw portalError("Deliverables are uploaded during final checks.");
  p.attachments.push(attachment(kind, filename, { created_at: nowIso(), client_visible: false, scan_status: "clean" }));
  touch(p);
}
function deliver(projectId, note, actorId) {
  const p = mustProject(projectId);
  if (p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can deliver.");
  if (p.status !== "in_review") throw portalError("Only work in final checks can be delivered.");
  if (!qcComplete(p.category, p.qc)) throw portalError("Complete every QC check before delivering.");
  if (!p.attachments.some((a) => a.kind === "deliverable")) throw portalError("Upload at least one deliverable file.");
  if (p.category === "writing" && !p.attachments.some((a) => a.kind === "quality_report")) throw portalError("Attach the originality and AI report for written work.");
  p.status = "delivered";
  p.delivered_at = nowIso();
  p.delivery_note = note.trim() || null;
  p.progress_percent = 100;
  p.progress_label = "Delivered";
  touch(p);
  recountSupervisorLoad();
  systemMessage(p, "Your work has been delivered");
  log("delivered", p, "Delivered to the client", opName(actorId));
}
function executePayout(projectDoerId, actorId) {
  const op = operator(actorId);
  if (op?.segment !== "qqd") throw portalError("Only QQD can execute payouts.");
  const p = state.projects.find((x) => x.doers.some((pd2) => pd2.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That payout line was not found.");
  if (p.status !== "completed" && !p.payout_released_at) throw portalError("Payout opens after client approval or a silent release.");
  const current = line(p, pd);
  if (current.status === "paid") throw portalError("This line was already paid.");
  if (current.gross_inr === 0) throw portalError("This payout is withheld by the liability decision.");
  const d = state.doers.find((x) => x.id === pd.doer_id);
  if (d?.verification_status !== "verified") throw portalError("PAN must be on file before any payout (FR-PO-003).");
  state.payouts.set(pd.id, { status: "paid", failure_reason: null, executed_by: op.full_name, executed_at: nowIso(), provider_ref: `pout_demo_${projectDoerId}` });
  state.fyPaid.set(pd.doer_id, (state.fyPaid.get(pd.doer_id) ?? 0) + current.gross_inr);
  pd.payout_status = "released";
  state.ledger.unshift({ id: nextId("lg"), type: "payout_executed", project_code: p.code, amount: current.net_inr, currency: "INR", inr_equivalent: current.net_inr, fx_rate: null, actor: op.full_name, provider_ref: `pout_demo_${projectDoerId}`, created_at: nowIso() });
  log("payout", p, `Paid ${pd.doer_code} ${formatInr(current.net_inr)} net (TDS ${formatInr(current.tds_inr)})`, op.full_name);
  const all = p.doers.filter(isActiveDoer).every((x) => state.payouts.get(x.id)?.status === "paid");
  if (all) {
    const margin = (p.quote_amount_inr ?? 0) - p.credits_applied_inr - p.doers.filter(isActiveDoer).reduce((s, x) => s + x.payout_amount_inr, 0);
    const reserve = Math.max(0, percentOf(margin, RESERVE_PERCENT_OF_MARGIN));
    state.ledger.unshift({ id: nextId("lg"), type: "reserve_held", project_code: p.code, amount: reserve, currency: "INR", inr_equivalent: reserve, fx_rate: null, actor: "System", provider_ref: null, created_at: nowIso() });
  }
}
function executeRefund(refundId, actorId) {
  const op = operator(actorId);
  if (op?.segment !== "qqd") throw portalError("Only QQD can execute refunds.");
  const r = state.refunds.find((x) => x.id === refundId);
  if (!r) throw portalError("That refund was not found.");
  if (r.status === "executed") throw portalError("This refund was already executed.");
  r.status = "executed";
  r.executed_by = op.full_name;
  r.executed_at = nowIso();
  const inrEq = Math.round(r.amount * DEMO_FX_TO_INR[r.currency]);
  state.ledger.unshift({ id: nextId("lg"), type: "refund_executed", project_code: r.project.code, amount: r.amount, currency: r.currency, inr_equivalent: inrEq, fx_rate: DEMO_FX_TO_INR[r.currency], actor: op.full_name, provider_ref: `rfnd_demo_${r.id}`, created_at: nowIso() });
  log("refund", null, `Refund executed for ${r.project.code}`, op.full_name);
}
function mustCase(id) {
  const c = state.verification.find((x) => x.id === id);
  if (!c) throw portalError("That verification case was not found.");
  return c;
}
function recordDocumentCheck(caseId, patch) {
  const c = mustCase(caseId);
  c.documents = patch.documents;
  c.payout_name_matches = patch.payout_name_matches;
}
function assignOnboarding(caseId, supervisorId) {
  const c = mustCase(caseId);
  if (c.documents.some((d) => !d.legible || !d.name_matches) || !c.payout_name_matches) throw portalError("Confirm every document and the payout name before assigning.");
  c.stage = "supervisor_call";
  c.assigned_supervisor_id = supervisorId;
}
function decideVerification(caseId, approve, reason, actorId) {
  const c = mustCase(caseId);
  const op = operator(actorId);
  if (op?.segment === "supervisor" && c.assigned_supervisor_id !== actorId) throw portalError("This doer is assigned to another supervisor for onboarding.");
  if (op?.segment === "support") throw portalError("Support cannot verify doers.");
  if (!approve && reason.trim().length < 10) throw portalError("Give the doer a clear reason and how to resubmit.");
  c.stage = approve ? "verified" : "rejected";
  c.rejection_reason = approve ? null : reason.trim();
  const d = state.doers.find((x) => x.id === c.doer_id);
  if (d) {
    d.verification_status = approve ? "verified" : "rejected";
    if (approve) d.level = 1;
  }
  log("ticket", null, `${c.doer_code} ${approve ? "verified, Level 1" : "verification rejected"}`, opName(actorId));
}
function mustTicket(id) {
  const t = state.tickets.find((x) => x.id === id);
  if (!t) throw portalError("That ticket was not found.");
  return t;
}
function addEntry(t, kind, author, body) {
  t.entries.push({ id: nextId("te"), kind, author_label: author, body, created_at: nowIso() });
}
function replyTicket(ticketId, body, actorId, internal) {
  const t = mustTicket(ticketId);
  body = cleanText(body, 4e3);
  if (!body.trim()) throw portalError("Write something first.");
  if (!TICKET_OPEN(t)) throw portalError("Reopen the ticket to reply.");
  if (operator(actorId)?.segment === "supervisor") throw portalError("Tickets are handled by Support and QQD.");
  addEntry(t, internal ? "internal_note" : "reply", internal ? opName(actorId) : "Support", body.trim());
  if (!internal && !t.first_response_at) t.first_response_at = nowIso();
  if (!internal && t.status === "new") t.status = "in_progress";
  if (!t.owner_id) t.owner_id = actorId;
}
var TICKET_OPEN = (t) => t.status !== "resolved" && t.status !== "closed";
function recommendRefund(ticketId, rec, liability, actorId) {
  const t = mustTicket(ticketId);
  if (!t.project_code) throw portalError("Link the ticket to a project before recommending a refund.");
  if (rec.amount <= 0) throw portalError("Enter a refund amount.");
  if (rec.note.trim().length < 20) throw portalError("Explain the recommendation so QQD can act on it.");
  const p = state.projects.find((x) => x.code === t.project_code);
  if (p && (p.status === "completed" || p.approved_at)) throw portalError("The refund window closed at client approval.");
  if (p && rec.amount > (p.quote_amount ?? 0)) throw portalError("A refund cannot exceed the amount paid.");
  t.refund_recommendation = { ...rec, note: rec.note.trim() };
  t.status = "awaiting_internal";
  addEntry(t, "event", opName(actorId), `Recommended a ${rec.kind} refund and sent it to QQD`);
  state.refunds.unshift({
    id: nextId("rf"),
    ticket_reference: t.reference,
    project: p ? { id: p.id, code: p.code, title: p.title, category: p.category, quote_amount: p.quote_amount, quote_currency: p.quote_currency, quote_amount_inr: p.quote_amount_inr, status: p.status } : { id: "unknown", code: t.project_code, title: t.subject, category: "other", quote_amount: rec.amount, quote_currency: rec.currency, quote_amount_inr: null, status: "in_progress" },
    kind: rec.kind,
    amount: rec.amount,
    currency: rec.currency,
    recommended_by: opName(actorId),
    recommendation: rec.note.trim(),
    liability_decision: liability,
    approved_at: nowIso(),
    status: "awaiting_execution",
    executed_by: null,
    executed_at: null
  });
  notify("qqd", "Refund approved by Support", `${t.reference} ${rec.kind} refund for ${t.project_code} is ready to execute.`, "/refunds", "info");
}

// scripts/qa-phase2-workflows.ts
console.log("=================================================");
console.log("QA PHASE 2: END-TO-END WORKFLOW TESTS");
console.log("=================================================\n");
var passed = 0;
var failed = 0;
function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${message}`);
  } else {
    failed++;
    console.error(`  \u2717 FAIL: ${message}`);
  }
}
async function runTests() {
  console.log("\n1. Testing Quote Lifecycle Workflow:");
  const initialProjects = read.projects();
  const quoteTarget = initialProjects.find((p) => p.status === "awaiting_quote");
  assert(quoteTarget !== void 0, `Found project awaiting quote: ${quoteTarget?.code}`);
  if (quoteTarget) {
    const qqdActor = "op-meera";
    const quoteAmount = 45e3;
    const doerCost = 18e5;
    const durationHours = 48;
    const note = "Includes research and 2 revision rounds.";
    sendQuote(
      quoteTarget.id,
      {
        amount: quoteAmount,
        currency: quoteTarget.client.currency,
        delivery_duration_hours: durationHours,
        expected_doer_cost_inr: doerCost,
        note
      },
      qqdActor
    );
    const quoted = read.project(quoteTarget.id);
    assert(quoted.status === "awaiting_payment", "Project status transitioned to awaiting_payment");
    assert(quoted.quote_amount === quoteAmount, "Quote amount correctly recorded");
    assert(quoted.delivery_duration_hours === durationHours, "Delivery duration recorded");
    assert(quoted.quote_expires_at !== null, "Quote expiry timestamp calculated and set");
    assert(quoted.qqd_id === qqdActor, "QQD quoting operator recorded");
    simulatePayment(quoted.id);
    const paid = read.project(quoted.id);
    assert(paid.status === "in_progress", "Project status transitioned to in_progress upon payment");
    assert(paid.paid_at !== null, "Payment capture timestamp recorded");
  }
  console.log("\n2. Testing Supervisor Assignment Workflow:");
  const unassigned = read.projects().find((p) => p.status === "in_progress" && !p.supervisor_id);
  assert(unassigned !== void 0, `Found unassigned paid project: ${unassigned?.code}`);
  if (unassigned) {
    const supervisorId = "op-kabir";
    assignSupervisor(unassigned.id, supervisorId, "op-meera");
    const assigned = read.project(unassigned.id);
    assert(assigned.supervisor_id === supervisorId, `Supervisor ${supervisorId} assigned to project`);
    assert(assigned.supervisor_assigned_at !== null, "Supervisor assignment timestamp recorded");
    const kabir = read.operators().find((o) => o.id === supervisorId);
    assert((kabir?.active_project_count ?? 0) > 0, "Supervisor active project count updated");
  }
  console.log("\n3. Testing Doer Sourcing & Offer Progression:");
  const sourcingProject = read.projects().find((p) => p.supervisor_id === "op-kabir" && p.doers.length === 0);
  assert(sourcingProject !== void 0, `Found project ready for doer sourcing: ${sourcingProject?.code}`);
  if (sourcingProject) {
    const qualifiedDoers = read.doers().filter(
      (d) => d.verification_status === "verified" && d.status === "active" && d.fields.includes(sourcingProject.category) && d.active_project_count < 3
    );
    assert(qualifiedDoers.length >= 3, `Found ${qualifiedDoers.length} qualified doers for ${sourcingProject.category}`);
    const doer1 = qualifiedDoers[0];
    const doer2 = qualifiedDoers[1];
    const doer3 = qualifiedDoers[2];
    sendOffer(
      sourcingProject.id,
      { doer_id: doer1.id, discipline: sourcingProject.category, payout_amount_inr: 8e5, scope_note: "Initial scope", required_module_id: null, as_additional_part: false },
      "op-kabir"
    );
    let pState = read.project(sourcingProject.id);
    const pd1 = pState.doers.find((d) => d.doer_id === doer1.id);
    assert(pd1 !== void 0 && pd1.status === "offered", `Offer 1 sent to ${doer1.doer_code}`);
    if (pd1) {
      simulateOfferResponse(pd1.id, false);
      pState = read.project(sourcingProject.id);
      assert(pState.failed_offer_count === 1, "Failed offer count incremented to 1 after decline");
      assert(!pState.in_open_pool, "Open pool remains locked after 1 failed offer");
    }
    sendOffer(
      sourcingProject.id,
      { doer_id: doer2.id, discipline: sourcingProject.category, payout_amount_inr: 8e5, scope_note: "Initial scope", required_module_id: null, as_additional_part: false },
      "op-kabir"
    );
    pState = read.project(sourcingProject.id);
    const pd2 = pState.doers.find((d) => d.doer_id === doer2.id);
    if (pd2) {
      simulateOfferResponse(pd2.id, false);
      pState = read.project(sourcingProject.id);
      assert(pState.failed_offer_count === 2, "Failed offer count incremented to 2");
      assert(pState.failed_offer_count >= OPEN_POOL_AFTER_FAILED_OFFERS, "Open pool threshold reached (>= 2)");
    }
    sendOffer(
      sourcingProject.id,
      { doer_id: doer3.id, discipline: sourcingProject.category, payout_amount_inr: 85e4, scope_note: "Full scope", required_module_id: null, as_additional_part: false },
      "op-kabir"
    );
    pState = read.project(sourcingProject.id);
    const pd3 = pState.doers.find((d) => d.doer_id === doer3.id);
    assert(pd3 !== void 0, "Offer 3 created");
    if (pd3) {
      simulateOfferResponse(pd3.id, true);
      pState = read.project(sourcingProject.id);
      const activeDoer = pState.doers.find((d) => d.doer_id === doer3.id);
      assert(activeDoer?.status === "accepted", "Doer offer accepted; doer is now active on project");
      assert(activeDoer?.accepted_at !== null, "Doer acceptance timestamp recorded");
    }
  }
  console.log("\n4. Testing Workspace Link Safety & Progress Tracking:");
  assert(!checkWorkspaceUrl("http://insecure-site.com").ok, "Insecure HTTP URL correctly rejected");
  assert(!checkWorkspaceUrl("https://admin:pass@figma.com/file/123").ok, "URL with embedded credentials rejected");
  assert(!checkWorkspaceUrl("https://figma.com:8443/file/123").ok, "URL with custom port rejected");
  assert(!checkWorkspaceUrl("https://unapproved-random-domain.xyz/file").ok, "Unapproved domain rejected");
  assert(checkWorkspaceUrl("https://www.figma.com/file/abcdef12345/Design-File").ok, "Approved Figma URL validated successfully");
  assert(checkWorkspaceUrl("https://docs.google.com/document/d/12345/edit").ok, "Approved Google Docs URL validated successfully");
  const linkedProject = read.projects().find((p) => p.doers.some((d) => d.status === "accepted"));
  assert(linkedProject !== void 0, `Found project with active doer: ${linkedProject?.code}`);
  if (linkedProject) {
    const doer2 = linkedProject.doers.find((d) => d.status === "accepted");
    setWorkingLink(doer2.id, "https://www.figma.com/file/project-test-123", linkedProject.supervisor_id ?? "op-kabir");
    const updated = read.project(linkedProject.id);
    const updatedDoer = updated.doers.find((d) => d.id === doer2.id);
    assert(updatedDoer?.working_link === "https://www.figma.com/file/project-test-123", "Workspace link safely attached to doer");
    updateProgress(linkedProject.id, 65, "First draft complete and reviewed", linkedProject.supervisor_id ?? "op-kabir");
    const withProgress = read.project(linkedProject.id);
    assert(withProgress.progress_percent === 65, "Progress percent updated to 65%");
    assert(withProgress.progress_label === "First draft complete and reviewed", "Progress label updated");
    assert(withProgress.progress_updated_at !== null, "Progress timestamp recorded");
  }
  console.log("\n5. Testing Quality Check Gate & Delivery Enforcement:");
  const qcTarget = read.projects().find((p) => p.status === "in_review");
  assert(qcTarget !== void 0, `Found project in review (QC): ${qcTarget?.code}`);
  if (qcTarget) {
    const supervisor = qcTarget.supervisor_id ?? "op-kabir";
    let blockedAsExpected = false;
    try {
      deliver(qcTarget.id, "Here is your work", supervisor);
    } catch (err) {
      blockedAsExpected = err.message.includes("check") || err.message.includes("deliverable") || err.message.includes("complete");
    }
    assert(blockedAsExpected, "Delivery gate blocked delivery when QC was incomplete");
    const items = QC_CHECKLISTS[qcTarget.category];
    const checks = {};
    for (const item of items) {
      checks[item.id] = true;
    }
    const custom_checks = (qcTarget.qc?.custom_checks ?? []).map((c) => ({ ...c, done: true }));
    saveQc(qcTarget.id, { checks, custom_checks, notes: "Reviewed and approved" }, supervisor);
    addDeliverable(qcTarget.id, "final_deliverable.pdf", "deliverable", supervisor);
    if (qcTarget.category === "writing") {
      addDeliverable(qcTarget.id, "originality_report.pdf", "quality_report", supervisor);
    }
    deliver(qcTarget.id, "Final delivery complete with documentation.", supervisor);
    const delivered = read.project(qcTarget.id);
    assert(delivered.status === "delivered", "Project delivered to client successfully");
    assert(delivered.delivered_at !== null, "Delivery timestamp recorded");
    assert(delivered.delivery_note !== null, "Delivery note attached for client");
  }
  console.log("\n6. Testing Approval, Disbursement & TDS Calculation:");
  assert(computeTds(1e6, 5e5) === 0, "TDS is 0 when cumulative FY is below 30,000 INR threshold");
  assert(computeTds(28e5, 5e5) === 33e4, "TDS is 10% on full cumulative amount when crossing 30,000 INR threshold");
  assert(computeTds(35e5, 5e5) === 5e4, "TDS is 10% on gross when FY before already exceeded threshold");
  const disbursements = read.disbursements();
  assert(disbursements.length > 0, `Disbursement queue has ${disbursements.length} items`);
  const pendingItem = disbursements.find((d) => d.lines.some((l) => l.status === "queued"));
  assert(pendingItem !== void 0, "Found disbursement item with queued payout line");
  if (pendingItem) {
    const queuedLine = pendingItem.lines.find((l) => l.status === "queued");
    assert(queuedLine.net_inr === queuedLine.gross_inr - queuedLine.tds_inr, "Net payable equals gross minus TDS");
    const expectedReserve = Math.max(0, percentOf(pendingItem.margin_inr, RESERVE_PERCENT_OF_MARGIN));
    assert(pendingItem.reserve_inr === expectedReserve, `Reserve calculated as ${RESERVE_PERCENT_OF_MARGIN}% of margin`);
    executePayout(queuedLine.project_doer_id, "op-meera");
    const updatedLine = read.disbursements().flatMap((d) => d.lines).find((l) => l.project_doer_id === queuedLine.project_doer_id);
    assert(updatedLine?.status === "paid", "Disbursement line status updated to paid");
    assert(updatedLine?.provider_ref !== null, "Provider reference ID assigned to payment transaction");
    assert(updatedLine?.executed_by === "Meera Krishnan", "Executing operator recorded");
  }
  console.log("\n7. Testing Support Ticket & Refund Recommendation Workflow:");
  const openTicket = read.tickets().find((t) => t.status === "new" && t.project_code);
  assert(openTicket !== void 0, `Found open support ticket: ${openTicket?.reference}`);
  if (openTicket) {
    replyTicket(openTicket.id, "Thank you for contacting us. We are looking into your request.", "op-arjun", false);
    const answered = read.ticket(openTicket.id);
    assert(answered.first_response_at !== null, "First response timestamp recorded on ticket");
    assert(answered.status === "in_progress", "Ticket transitioned to in_progress");
    recommendRefund(
      openTicket.id,
      { kind: "partial", amount: 5e3, currency: "USD", note: "Delay caused minor inconvenience" },
      "not_at_fault",
      "op-arjun"
    );
    const recommended = read.ticket(openTicket.id);
    assert(recommended.refund_recommendation !== null, "Refund recommendation recorded on ticket");
    const refunds2 = read.refunds();
    const refundCase = refunds2.find((r) => r.ticket_reference === openTicket.reference);
    assert(refundCase !== void 0, `Refund case queued for QQD execution: ${refundCase?.ticket_reference}`);
    if (refundCase) {
      executeRefund(refundCase.id, "op-meera");
      const executed = read.refunds().find((r) => r.id === refundCase.id);
      assert(executed?.status === "executed", "Refund status updated to executed");
      assert(executed?.executed_at !== null, "Refund execution timestamp recorded");
      assert(executed?.executed_by === "Meera Krishnan", "Executing QQD operator recorded");
    }
  }
  console.log("\n8. Testing Doer Onboarding & Level 1 Verification:");
  const vCase = read.verification().find((v) => v.stage === "document_check");
  assert(vCase !== void 0, `Found verification case in document check: ${vCase?.doer_code}`);
  if (vCase) {
    recordDocumentCheck(vCase.id, {
      documents: vCase.documents.map((d) => ({ ...d, legible: true, name_matches: true })),
      payout_name_matches: true
    });
    assignOnboarding(vCase.id, "op-kabir");
    let cState = read.verification().find((v) => v.id === vCase.id);
    assert(cState.stage === "supervisor_call", "Case moved to supervisor_call stage");
    assert(cState.assigned_supervisor_id === "op-kabir", "Supervisor assigned for identity call");
    decideVerification(vCase.id, true, "", "op-kabir");
    cState = read.verification().find((v) => v.id === vCase.id);
    assert(cState.stage === "verified", "Doer verification case completed as verified");
    const doer2 = read.doer(vCase.doer_id);
    assert(doer2.verification_status === "verified", "Doer pool record marked as verified");
    assert(doer2.level === 1, "Doer initialized at Level 1");
  }
  console.log("\n9. Testing Message Moderation Boundary:");
  const heldItems = read.held();
  assert(heldItems.length > 0, `Held moderation queue populated with ${heldItems.length} items`);
  if (heldItems.length > 0) {
    const itemToApprove = heldItems[0];
    moderate(itemToApprove.message.id, "approve", "op-meera");
    const msgs = read.messages(itemToApprove.message.project_id, itemToApprove.message.channel);
    const approvedMsg = msgs.find((m) => m.id === itemToApprove.message.id);
    assert(approvedMsg?.state === "approved", "Approved message state updated to approved");
    assert(approvedMsg?.moderated_by === "op-meera", "Moderating operator recorded");
    if (heldItems.length > 1) {
      const itemToRemove = heldItems[1];
      moderate(itemToRemove.message.id, "remove", "op-meera");
      const msgsAfter = read.messages(itemToRemove.message.project_id, itemToRemove.message.channel);
      const removedMsg = msgsAfter.find((m) => m.id === itemToRemove.message.id);
      assert(removedMsg?.state === "removed", "Removed message state updated to removed");
    }
  }
  console.log(`
=================================================`);
  console.log(`QA Phase 2 Summary: ${passed} passed, ${failed} failed`);
  console.log(`=================================================
`);
  if (failed > 0) process.exit(1);
}
runTests().catch((err) => {
  console.error("Unhandled error during QA Phase 2:", err);
  process.exit(1);
});
