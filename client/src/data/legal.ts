// legal.ts — the source of truth for every legal / policy page in the app.
//
// HOW TO EDIT (for Lea): everything is plain text. To change wording, edit the
// strings below. To change the business name, contact email, or dates, edit the
// constants right here at the top — they flow into every document automatically.
//
// IMPORTANT — these documents are a solid, well-researched STARTING TEMPLATE,
// not legal advice. Before you rely on them for paid, worldwide sales, have an
// Australian lawyer (ideally one who knows consumer + privacy law) read them.
// Anything you still need to decide is marked with the word REVIEW.

// ─────────────────────────────────────────────────────────────────────────────
// Edit these once; they appear everywhere.
// ─────────────────────────────────────────────────────────────────────────────
export const ENTITY = "DBS Fitness Australia";
export const ENTITY_LONG = "DBS Fitness Australia"; // REVIEW: if you register a Pty Ltd, put the full legal name + ACN here.
export const ABN = "[ABN — add your ABN here]"; // REVIEW: add your ABN/ACN once registered.
export const PROPRIETOR = "Lea Hamley"; // the person behind UNSTUCK / DBS Fitness Australia
export const CONTACT_EMAIL = "dbsfitnessaustralia@gmail.com";
export const SITE_URL = "https://unstuck-app.onrender.com";
export const PRODUCT = "UNSTUCK: The 28-Day Mobility Reset";
export const GOVERNING_STATE = "Western Australia";
export const GOVERNING_COUNTRY = "Australia";
export const EFFECTIVE_DATE = "20 June 2026";

// ─────────────────────────────────────────────────────────────────────────────
// Types — a document is a list of simple blocks so the renderer stays dumb.
// ─────────────────────────────────────────────────────────────────────────────
export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "note"; text: string }; // a highlighted callout (used for safety / important bits)

export interface LegalDoc {
  slug: string;
  title: string;
  short: string; // one-liner for the index
  icon: string;
  blocks: Block[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIVACY POLICY
// ─────────────────────────────────────────────────────────────────────────────
const privacy: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  short: "What personal information we collect, why, who we share it with, and your rights.",
  icon: "🔒",
  blocks: [
    { t: "p", text: `This Privacy Policy explains how ${ENTITY} (“we”, “us”, “our”) handles personal information when you use ${PRODUCT} and the app at ${SITE_URL} (the “App”). We are based in ${GOVERNING_STATE}, ${GOVERNING_COUNTRY}, and we sell and provide the App to people around the world.` },
    { t: "p", text: `We handle personal information in line with the Australian Privacy Principles (APPs) in the Privacy Act 1988 (Cth). Because the App collects health-related information, we treat ourselves as bound by the Privacy Act and choose to follow the APPs in full, regardless of our size. Where you are in the EU/EEA or UK we also aim to meet the GDPR / UK GDPR, and where you are in California we honour the rights described below.` },

    { t: "h", text: "The information we collect" },
    { t: "p", text: "We collect only what we need to run the program:" },
    { t: "ul", items: [
      "Account details — your email address (used for passwordless “magic link” sign-in).",
      "Program progress — your worksheet log, session ticks, chosen tier (🟢/🟡/🔴), and the results you enter in the Assessment area (for example mobility test scores and pass/fail checks).",
      "Photos you choose to upload — optional before/after photos you add to the Assessment area. These are stored privately and only you can see them.",
      "Coach messages — the questions you type to the in-app Coach and the conversation history needed to answer them.",
      "Purchase / access information — the beta code or purchase (Gumroad) licence key you redeem to unlock the program, and the fact that it was redeemed.",
      "Technical information — basic data your browser sends automatically (such as IP address and device/browser type) and security logs, used to keep the App running and to prevent abuse.",
    ]},

    { t: "h", text: "Sensitive and health information" },
    { t: "p", text: "Mobility scores, body photos, and what you tell the Coach can reveal health-related information. Under Australian law this is “sensitive information” and gets extra protection. We collect it only with your consent — by entering it into the App you consent to us handling it to deliver the program. You don’t have to enter it; the App still works without photos or assessment data, you’ll just get less out of it." },

    { t: "h", text: "How we use your information" },
    { t: "ul", items: [
      "To give you access to the program and save your progress across your devices.",
      "To answer your questions through the in-app Coach.",
      "To verify your purchase or beta access.",
      "To keep the App secure, prevent abuse, fix problems, and improve the program.",
      "To contact you about your account or important changes (for example a security or policy update).",
    ]},
    { t: "p", text: "We do not sell your personal information. We do not use it for third-party advertising." },

    { t: "h", text: "Automated processing and AI" },
    { t: "p", text: "The in-app Coach is powered by an artificial-intelligence service (Anthropic’s Claude API). When you message the Coach, your message and the program context are sent to Anthropic to generate a reply, and the Coach may run a web search to answer questions about current information. The Coach gives general guidance only — it does not make any decision that has a legal or similarly significant effect on you, and it is not a substitute for professional or medical advice. We do not use your data to train AI models." },

    { t: "h", text: "Who we share it with (our service providers)" },
    { t: "p", text: "We use a small number of trusted providers to run the App. They only process your data on our instructions, to provide their service:" },
    { t: "ul", items: [
      "Supabase — accounts, database, and private photo storage. Hosted in Sydney, Australia (ap-southeast-2).",
      "Render — hosts the App and the Coach server.",
      "Anthropic (Claude API) — powers the Coach; receives your Coach messages and program context. Anthropic may process this in the United States.",
      "Gumroad — processes purchases. Gumroad is the “merchant of record” for sales and handles payment and tax; we never see your full card details.",
    ]},
    { t: "p", text: "We may also disclose information if the law requires it, to protect our rights or someone’s safety, or as part of a business transfer (with notice)." },

    { t: "h", text: "Overseas disclosure" },
    { t: "p", text: "Some providers process data outside Australia (for example Anthropic and some Render/Gumroad infrastructure in the United States, and Gumroad/your payment data in various countries). By using the App you acknowledge this overseas handling. We take reasonable steps to ensure providers protect your information to a standard consistent with this policy." },

    { t: "h", text: "How long we keep it" },
    { t: "p", text: "We keep your account and progress data while your account is active. If you delete your account (see “Your data” in the App), we delete your profile, progress, and uploaded photos. We may keep minimal records where the law requires (for example basic transaction records) and security logs for a short period." },

    { t: "h", text: "Security" },
    { t: "p", text: "We protect your data with measures including encrypted connections (HTTPS), database row-level security so you can only ever access your own records, private photo storage scoped to your account, and server-side secrets that never reach your browser. No system is perfectly secure, but we take reasonable steps to protect your information." },

    { t: "h", text: "Your rights" },
    { t: "p", text: "Wherever you live, you can:" },
    { t: "ul", items: [
      "Access the personal information we hold about you.",
      "Ask us to correct it if it’s wrong.",
      "Delete your account and data — directly in the App under “Your data”, or by emailing us.",
      "Withdraw consent for optional data (for example by deleting your photos).",
      "Complain if you think we’ve mishandled your information.",
    ]},
    { t: "p", text: `If you are in the EU/EEA or UK, you also have GDPR rights including data portability, restriction, objection, and the right to lodge a complaint with your local data protection authority. Our lawful bases are: performing our contract with you (delivering the program), your consent (for sensitive data and the Coach), and our legitimate interests (security and improving the App). If you are in California, you have the right to know, delete, and correct your information, and not to be discriminated against for exercising those rights — we do not sell or “share” personal information as those terms are defined under California law.` },

    { t: "h", text: "Children" },
    { t: "p", text: "The App is not intended for anyone under 16. We do not knowingly collect information from children under 16. If you believe a child has provided us information, contact us and we’ll delete it." },

    { t: "h", text: "Data breaches" },
    { t: "p", text: "If a data breach occurs that is likely to cause serious harm, we will act on it and notify affected users and the relevant regulator (such as the Office of the Australian Information Commissioner) as required by law." },

    { t: "h", text: "Complaints and contact" },
    { t: "p", text: `Questions, requests, or complaints: email ${CONTACT_EMAIL}. We’ll respond within a reasonable time (and within any timeframe the law requires). If you’re in Australia and not satisfied with our response, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. TERMS & CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────
const terms: LegalDoc = {
  slug: "terms",
  title: "Terms & Conditions",
  short: "The agreement between you and us when you use or buy the program.",
  icon: "📄",
  blocks: [
    { t: "p", text: `These Terms & Conditions (“Terms”) are an agreement between you and ${ENTITY} (“we”, “us”). They apply when you access or use ${PRODUCT} and the app at ${SITE_URL} (the “App”). By creating an account or using the App, you agree to these Terms. If you don’t agree, don’t use the App.` },
    { t: "note", text: "Important: read these Terms together with our Health & Fitness Disclaimer and our Privacy Policy — they all form part of your agreement with us." },

    { t: "h", text: "Eligibility" },
    { t: "p", text: "You must be at least 16 years old to use the App, and at least 18 to make a purchase. By using the App you confirm you meet these requirements and that any information you give us is accurate." },

    { t: "h", text: "Your account" },
    { t: "p", text: "You sign in with a passwordless email link. Keep access to your email secure — anyone who can open your sign-in link can access your account. Tell us promptly if you think your account has been accessed without permission. You’re responsible for activity under your account." },

    { t: "h", text: "Your licence to use the program" },
    { t: "p", text: "When you unlock the program (via a beta code or a purchase), we grant you a personal, non-exclusive, non-transferable, revocable licence to access and use the program content for your own personal, non-commercial use. You may not copy, share, resell, sublicense, publish, or redistribute the content, or use it to train any product or to run classes/services for others, without our written permission." },

    { t: "h", text: "Purchases, payment and merchant of record" },
    { t: "p", text: "Purchases are processed by Gumroad, which acts as the merchant of record. That means Gumroad sells the licence to you on our behalf and is responsible for collecting and remitting applicable sales tax, VAT, or GST for your country. Your purchase is also subject to Gumroad’s own terms. Prices are shown at checkout and may change, but changes don’t affect purchases already made." },

    { t: "h", text: "Refunds" },
    { t: "p", text: "Our Refund & Cancellation Policy forms part of these Terms. In short: your rights under the Australian Consumer Law (and any equivalent consumer law where you live) always apply and can’t be excluded, and on top of that we offer a goodwill refund window. See the Refund & Cancellation Policy for details." },

    { t: "h", text: "The in-app Coach (AI)" },
    { t: "p", text: "The Coach is an AI assistant that gives general information about the program. It can be wrong, incomplete, or out of date, and it may use web search. It is not professional, medical, physiotherapy, or health advice, and it is not a person. Don’t rely on it for decisions about your health — see the Health & Fitness Disclaimer." },

    { t: "h", text: "Acceptable use" },
    { t: "p", text: "When using the App you agree not to:" },
    { t: "ul", items: [
      "Break the law, or use the App to harm, harass, or infringe anyone’s rights.",
      "Share your account, licence key, or the program content with people who haven’t paid.",
      "Copy, scrape, reverse-engineer, or try to extract the source content or code.",
      "Upload content that is unlawful, offensive, infringing, or that isn’t yours to upload.",
      "Attempt to break, overload, or get unauthorised access to the App or other users’ data.",
      "Misuse the Coach (for example to generate harmful content or to probe the system).",
    ]},

    { t: "h", text: "User content" },
    { t: "p", text: "You keep ownership of the photos and text you add (your “User Content”). Our User-Generated Content & Liability terms govern that content and form part of these Terms." },

    { t: "h", text: "Intellectual property" },
    { t: "p", text: "The program, its text, design, illustrations, and code are owned by us or our licensors and are protected by copyright and other laws. See our Intellectual Property & Copyright notice. Specific methods (CARs and PAILs/RAILs) come from Dr Andreo Spina’s Functional Range Conditioning (FRC) and are attributed accordingly." },

    { t: "h", text: "Availability" },
    { t: "p", text: "We try to keep the App available but we don’t guarantee it will be uninterrupted, error-free, or available forever. We may change, suspend, or discontinue features, and we may carry out maintenance. We’re not liable for downtime caused by third-party providers." },

    { t: "h", text: "Suspension and termination" },
    { t: "p", text: "We may suspend or end your access if you breach these Terms or misuse the App. You can stop using the App and delete your account at any time. Sections that by their nature should survive (such as intellectual property, disclaimers, and liability) continue after termination." },

    { t: "h", text: "Disclaimers" },
    { t: "p", text: "Except for guarantees that can’t be excluded by law, the App and program are provided “as is” and “as available”, without warranties of any kind. We don’t warrant that the program will achieve any particular result — outcomes depend on you." },

    { t: "h", text: "Limitation of liability" },
    { t: "p", text: `Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or remedy you have under the Australian Consumer Law or any other law that cannot lawfully be excluded. Where our liability for failing to comply with a consumer guarantee can be limited, we limit it (at our option) to re-supplying the program or paying the cost of re-supply. Subject to that, and to the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential loss, and our total liability to you is limited to the amount you paid us for the program in the 12 months before the claim.` },

    { t: "h", text: "Indemnity" },
    { t: "p", text: "To the extent permitted by law, you agree to cover us for claims, losses, and costs arising from your breach of these Terms, your misuse of the App, or content you upload." },

    { t: "h", text: "Governing law and disputes" },
    { t: "p", text: `These Terms are governed by the laws of ${GOVERNING_STATE}, ${GOVERNING_COUNTRY}. Our dispute-resolution process is set out in the Dispute Resolution policy, which forms part of these Terms. If you are a consumer, nothing here takes away your right to bring proceedings in your local courts where the law gives you that right.` },

    { t: "h", text: "Changes to these Terms" },
    { t: "p", text: `We may update these Terms from time to time. We’ll change the “last updated” date and, for material changes, take reasonable steps to let you know. Continuing to use the App after changes means you accept the updated Terms.` },

    { t: "h", text: "Contact" },
    { t: "p", text: `Questions about these Terms: ${CONTACT_EMAIL}.` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. HEALTH & FITNESS DISCLAIMER  (critical for an exercise product)
// ─────────────────────────────────────────────────────────────────────────────
const health: LegalDoc = {
  slug: "health-disclaimer",
  title: "Health & Fitness Disclaimer",
  short: "Exercise carries risk. Read this before you start moving.",
  icon: "🛑",
  blocks: [
    { t: "note", text: "This is general fitness education, not medical advice. The program does not replace a doctor, physiotherapist, or other qualified health professional. Always get medical clearance before starting any new exercise program, especially if you have an injury, a health condition, or any doubt." },

    { t: "h", text: "No medical advice" },
    { t: "p", text: `${PRODUCT} and the in-app Coach provide general mobility and movement education only. They do not diagnose, treat, or cure anything, and they are not a substitute for professional medical or physiotherapy advice, diagnosis, or treatment. Never ignore or delay professional advice because of something in the App.` },

    { t: "h", text: "Consult a professional first" },
    { t: "p", text: "Before starting, talk to your doctor or a qualified health professional — particularly if you are new to exercise, are pregnant or recently gave birth, have had recent surgery, have a history of disc or spinal problems, have any injury or chronic condition, or take medication that affects exercise. If a movement has been off-limits for you in the past, it still is until a professional clears you." },

    { t: "h", text: "Stop signs — stop the session if you feel:" },
    { t: "ul", items: [
      "Sharp pain.",
      "Radiating pain, pins-and-needles, or numbness.",
      "Pain that gets worse rep to rep.",
      "Joint clicking that comes with pain.",
      "Pain that lingers past about 48 hours.",
    ]},
    { t: "p", text: "If any of these happen, stop and, if it’s sharp, radiating, progressive, or persistent, see a physiotherapist or doctor. Don’t push through pain." },

    { t: "h", text: "Not for everyone" },
    { t: "p", text: "This version of the program is not suitable during pregnancy or the early postpartum period, after recent surgery, or for anyone with a history of disc symptoms performing loaded spinal flexion (for example Cat-Cow, Forward Fold, Inchworm, Jefferson Curl, or Child’s Pose with Side Reach). If that’s you, do not attempt those movements without clearance from a qualified professional." },

    { t: "h", text: "Train within your limits" },
    { t: "p", text: "Use the tier system (🟢 Recreational / 🟡 Intermediate / 🔴 Athlete) honestly and drop a tier when you’re tired, stressed, unwell, or under heavy training load. Earn depth — don’t force it. You are responsible for choosing movements and intensities that are right for your body on the day." },

    { t: "h", text: "Assumption of risk" },
    { t: "p", text: "Exercise carries an inherent risk of injury. By using the program you acknowledge those risks and accept responsibility for your own participation and choices. To the maximum extent permitted by law, and without excluding any rights you have under the Australian Consumer Law or other non-excludable laws, you take part voluntarily and at your own risk." },

    { t: "h", text: "Method attribution" },
    { t: "p", text: "Controlled Articular Rotations (CARs) and PAILs/RAILs are drawn from Dr Andreo Spina’s Functional Range Conditioning (FRC) and are used here with attribution." },

    { t: "h", text: "The Coach is not a clinician" },
    { t: "p", text: "The in-app Coach will route genuinely medical questions to a physiotherapist or doctor. Please follow that guidance. For any suspected injury, get assessed in person." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFUND & CANCELLATION POLICY
// ─────────────────────────────────────────────────────────────────────────────
const refunds: LegalDoc = {
  slug: "refunds",
  title: "Refund & Cancellation Policy",
  short: "Your consumer rights, plus our goodwill refund window.",
  icon: "💸",
  blocks: [
    { t: "p", text: `${PRODUCT} is a digital product. This policy explains when you can get a refund. It works alongside — and never reduces — your rights under the Australian Consumer Law and any equivalent consumer law where you live.` },

    { t: "h", text: "Your consumer guarantees (can’t be excluded)" },
    { t: "p", text: "Under the Australian Consumer Law, our program comes with guarantees that can’t be excluded. If the program has a major problem — for example it’s significantly different from what was described, or it isn’t fit for its stated purpose — you’re entitled to a remedy, which may include a refund. These rights apply regardless of anything else in this policy, and they apply to consumers in Australia even though we sell worldwide." },

    { t: "h", text: "Our goodwill window" },
    { t: "p", text: "On top of your legal rights, we offer a goodwill refund: if the program isn’t for you, email us within 14 days of purchase and we’ll refund you. We’d love to hear why so we can improve, but you don’t have to justify it within this window." },

    { t: "h", text: "Change of mind after 14 days" },
    { t: "p", text: "Because this is a digital product you get immediate access to, we don’t generally offer change-of-mind refunds after the 14-day window — but your non-excludable consumer guarantees still apply at any time if something is genuinely wrong with the product." },

    { t: "h", text: "How refunds are processed" },
    { t: "p", text: "Purchases are handled by Gumroad as merchant of record, so refunds are issued back through Gumroad to your original payment method. Any tax collected at purchase is refunded by Gumroad as part of that process. Refunds can take a few business days to appear depending on your bank." },

    { t: "h", text: "How to request a refund" },
    { t: "p", text: `Email ${CONTACT_EMAIL} from the address you bought with, including your Gumroad receipt or order number. We’ll sort it out promptly.` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. DATA & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
const compliance: LegalDoc = {
  slug: "data-compliance",
  title: "Data & Compliance",
  short: "Plain-English summary of the laws we follow and how your data is handled.",
  icon: "🛡️",
  blocks: [
    { t: "p", text: `This page summarises how ${ENTITY} approaches data protection and compliance for a product sold worldwide from ${GOVERNING_STATE}, ${GOVERNING_COUNTRY}. For full detail, read the Privacy Policy and Cookie Policy.` },

    { t: "h", text: "Laws we work to" },
    { t: "ul", items: [
      "Privacy Act 1988 (Cth) and the Australian Privacy Principles — our baseline. Because we handle health-related information, we follow the APPs in full.",
      "GDPR (EU/EEA) and UK GDPR — for users in those regions, including lawful-basis, transparency, and data-subject rights.",
      "California Consumer Privacy Act / CPRA — for California residents’ rights to know, delete, and correct.",
      "Australian Consumer Law — for consumer guarantees, refunds, and fair-trading.",
      "Spam Act 2003 (Cth) — any marketing email is consent-based with an unsubscribe option.",
    ]},

    { t: "h", text: "Where your data lives" },
    { t: "p", text: "Your account, progress, and photos are stored with Supabase in Sydney, Australia (ap-southeast-2). The App and Coach server are hosted on Render. Coach messages are processed by Anthropic (Claude API), which may be in the United States. Purchases are handled by Gumroad. See the Privacy Policy for the full sub-processor list and overseas-disclosure details." },

    { t: "h", text: "Our sub-processors" },
    { t: "ul", items: [
      "Supabase — accounts, database, private photo storage (Sydney, AU).",
      "Render — application and server hosting.",
      "Anthropic — AI Coach (Claude API).",
      "Gumroad — payments and merchant-of-record tax handling.",
    ]},

    { t: "h", text: "Security measures" },
    { t: "ul", items: [
      "Encrypted connections (HTTPS) everywhere.",
      "Database row-level security: each user can only ever read or write their own records.",
      "Private photo storage scoped to each user’s account.",
      "Server-side secrets (API keys) that never reach the browser.",
      "Rate limiting and input validation to prevent abuse.",
    ]},

    { t: "h", text: "Data-subject / privacy requests" },
    { t: "p", text: `You can access, correct, or delete your data from the “Your data” page in the App, or by emailing ${CONTACT_EMAIL}. We aim to action verified requests within 30 days.` },

    { t: "h", text: "Data breach response" },
    { t: "p", text: "We follow the Notifiable Data Breaches scheme: if a breach is likely to cause serious harm, we’ll contain it and notify affected users and the OAIC (and other regulators where required)." },

    { t: "h", text: "International transfers" },
    { t: "p", text: "Where data is processed outside your country (for example by Anthropic in the US), we rely on our service providers’ safeguards and contractual protections, and we limit transfers to what’s needed to run the App." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. INTELLECTUAL PROPERTY & COPYRIGHT
// ─────────────────────────────────────────────────────────────────────────────
const ip: LegalDoc = {
  slug: "intellectual-property",
  title: "Intellectual Property & Copyright",
  short: "Who owns the program, and what you may and may not do with it.",
  icon: "©️",
  blocks: [
    { t: "p", text: `© ${new Date().getFullYear()} ${ENTITY}. All rights reserved (except where stated). ${PRODUCT}, including its text, structure, illustrations, photography, design, branding, and software code, is owned by ${ENTITY} or its licensors and is protected by Australian and international copyright and intellectual-property laws.` },

    { t: "h", text: "Your licence" },
    { t: "p", text: "Your purchase or beta access gives you a personal, non-exclusive, non-transferable, revocable licence to use the program for your own personal, non-commercial use. Ownership stays with us — you’re buying access, not the rights." },

    { t: "h", text: "What you may not do" },
    { t: "ul", items: [
      "Copy, reproduce, or republish the program or substantial parts of it.",
      "Share, resell, sublicense, rent, or distribute the content or your access.",
      "Use the content to teach classes, coach clients, or build a competing product.",
      "Use the content (or App output) to train machine-learning or AI systems.",
      "Remove or alter any copyright, trademark, or attribution notices.",
    ]},

    { t: "h", text: "Trademarks" },
    { t: "p", text: `“UNSTUCK”, “DBS Fitness Australia”, “Don’t Be Sh*t. Move better.”, and related logos and marks are trademarks of ${ENTITY}. You may not use them without our written permission.` },

    { t: "h", text: "Third-party methods" },
    { t: "p", text: "Controlled Articular Rotations (CARs) and PAILs/RAILs originate from Dr Andreo Spina’s Functional Range Conditioning (FRC) and remain the intellectual property of their owners; we reference them with attribution." },

    { t: "h", text: "Feedback" },
    { t: "p", text: "If you send us ideas or suggestions, you allow us to use them to improve the program without obligation to you." },

    { t: "h", text: "Contact" },
    { t: "p", text: `Licensing or permission requests: ${CONTACT_EMAIL}.` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. IP INFRINGEMENT / COPYRIGHT COMPLAINTS  (notice-and-takedown)
// ─────────────────────────────────────────────────────────────────────────────
const infringement: LegalDoc = {
  slug: "ip-infringement",
  title: "IP Infringement & Copyright Complaints",
  short: "How to report content you believe infringes your rights — and how to respond.",
  icon: "⚠️",
  blocks: [
    { t: "p", text: `We respect intellectual-property rights and expect users to do the same. If you believe content in the App, or content a user has uploaded, infringes your copyright or other IP rights, tell us and we’ll act on valid reports. This procedure aligns with the U.S. Digital Millennium Copyright Act (DMCA) notice-and-takedown approach and with Australian law.` },

    { t: "h", text: "How to send a notice" },
    { t: "p", text: `Email ${CONTACT_EMAIL} with the subject “IP/Copyright Complaint” and include:` },
    { t: "ul", items: [
      "Your name and contact details.",
      "A description of the work or right you say is infringed.",
      "Where the allegedly infringing content is in the App (enough detail for us to find it).",
      "A statement that you have a good-faith belief the use isn’t authorised by the rights holder, an agent, or the law.",
      "A statement that the information in your notice is accurate, and that you are the rights holder or authorised to act for them.",
      "Your physical or electronic signature.",
    ]},

    { t: "h", text: "What we do" },
    { t: "p", text: "When we receive a valid notice we’ll review it and, where appropriate, remove or disable access to the content and notify the user who posted it. We may remove content we reasonably believe is infringing, and we may suspend repeat infringers." },

    { t: "h", text: "Counter-notice" },
    { t: "p", text: `If your content was removed and you believe that was a mistake or that you’re authorised to use it, email ${CONTACT_EMAIL} with the subject “Counter-Notice”, identifying the content, explaining why it should be restored, and confirming the accuracy of your statement and your contact details. We’ll consider valid counter-notices and may restore the content.` },

    { t: "h", text: "Misuse" },
    { t: "p", text: "Knowingly making a false claim of infringement (or a false counter-notice) may make you liable for resulting costs and damages." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. COOKIE POLICY
// ─────────────────────────────────────────────────────────────────────────────
const cookies: LegalDoc = {
  slug: "cookies",
  title: "Cookie Policy",
  short: "What we store on your device, and why.",
  icon: "🍪",
  blocks: [
    { t: "p", text: `This policy explains the small pieces of data the App stores on your device — “cookies” and the similar “local storage” the App uses. We keep this minimal.` },

    { t: "h", text: "What we use" },
    { t: "p", text: "We currently use only essential storage needed for the App to work:" },
    { t: "ul", items: [
      "Sign-in session — stored by our accounts provider (Supabase) so you stay signed in. Without it you’d have to sign in on every screen.",
      "Your preferences and progress cache — for example your chosen tier and a local copy of your progress, so the App is fast and works smoothly.",
      "Cookie-notice acknowledgement — a flag that remembers you’ve seen the cookie banner so we don’t keep showing it.",
    ]},

    { t: "h", text: "What we don’t use" },
    { t: "p", text: "We do not currently use third-party advertising cookies, cross-site tracking, or analytics that profile you. If we add analytics in the future, we’ll update this policy and, where the law requires (for example in the EU/EEA and UK), ask for your consent before setting non-essential cookies." },

    { t: "h", text: "Managing storage" },
    { t: "p", text: "Because we only use essential storage, the App needs it to function. You can clear it any time through your browser settings (clearing site data will sign you out and remove the local cache), or by signing out and deleting your account." },

    { t: "h", text: "Contact" },
    { t: "p", text: `Questions: ${CONTACT_EMAIL}.` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. ACCESSIBILITY STATEMENT
// ─────────────────────────────────────────────────────────────────────────────
const accessibility: LegalDoc = {
  slug: "accessibility",
  title: "Accessibility Statement",
  short: "Our commitment to making the App usable for everyone.",
  icon: "♿",
  blocks: [
    { t: "p", text: `We want ${PRODUCT} to be usable by as many people as possible. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA as a target standard.` },

    { t: "h", text: "What we do" },
    { t: "ul", items: [
      "High-contrast colours and large, legible text that’s meant to be read on a phone, mid-session.",
      "Meaning is never carried by colour alone — tiers always pair a colour with an emoji and a label (🟢 Recreational / 🟡 Intermediate / 🔴 Athlete).",
      "Labels on interactive controls and images so screen readers can describe them.",
      "A mobile-first layout that adapts to your screen and zoom level.",
      "Motion kept simple, with respect for reduced-motion preferences where supported.",
    ]},

    { t: "h", text: "Known limitations" },
    { t: "p", text: "We’re a small team and this is an evolving product, so some areas may not yet fully meet AA. We treat accessibility as ongoing work and fix issues as we find them." },

    { t: "h", text: "Tell us / get help" },
    { t: "p", text: `If you hit an accessibility barrier, or need program content in a different format, email ${CONTACT_EMAIL} and we’ll do our best to help and to fix the underlying issue.` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. USER-GENERATED CONTENT & LIABILITY
// ─────────────────────────────────────────────────────────────────────────────
const ugc: LegalDoc = {
  slug: "user-content",
  title: "User-Generated Content & Liability",
  short: "The rules for content you upload, and who’s responsible for it.",
  icon: "📤",
  blocks: [
    { t: "p", text: `The App lets you add your own content — for example assessment photos and the questions you type to the Coach (“User Content”). This policy covers that content. It forms part of our Terms & Conditions.` },

    { t: "h", text: "You own your content" },
    { t: "p", text: "You keep ownership of your User Content. Your photos are stored privately and are visible only to you — we don’t publish them or share them with other users." },

    { t: "h", text: "The licence you give us" },
    { t: "p", text: "You grant us a limited licence to store, process, and display your User Content back to you only as needed to operate the App (for example saving your photos so they sync across your devices, and processing your Coach messages to answer them). This licence ends when you delete the content or your account, except for backups that age out and anything we must keep by law." },

    { t: "h", text: "Your responsibilities" },
    { t: "p", text: "You’re responsible for your User Content. You confirm that you own it or have the right to upload it, and you agree not to upload content that:" },
    { t: "ul", items: [
      "Is unlawful, infringing, defamatory, or violates anyone’s privacy or rights.",
      "Contains another person without their consent.",
      "Is obscene, harmful, or otherwise objectionable.",
      "Contains malware or attempts to interfere with the App.",
    ]},

    { t: "h", text: "Our rights" },
    { t: "p", text: "We don’t routinely monitor User Content, but we may review, remove, or disable content that we reasonably believe breaches these rules or the law, and we may suspend accounts that misuse the App. See also our IP Infringement & Copyright Complaints procedure." },

    { t: "h", text: "Liability for User Content" },
    { t: "p", text: "To the maximum extent permitted by law, and without limiting your non-excludable consumer rights, we are not responsible or liable for User Content, and you are responsible for the content you upload and for any consequences of uploading it. You agree to cover us for third-party claims arising from your User Content or your breach of this policy." },

    { t: "h", text: "Coach inputs" },
    { t: "p", text: "Don’t paste sensitive personal information about other people into the Coach. Messages you send to the Coach are processed by our AI provider to generate replies, as described in the Privacy Policy." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. DISPUTE RESOLUTION  (WA law, ACL-safe)
// ─────────────────────────────────────────────────────────────────────────────
const disputes: LegalDoc = {
  slug: "disputes",
  title: "Dispute Resolution",
  short: "How we sort out problems — and your rights as a consumer.",
  icon: "⚖️",
  blocks: [
    { t: "p", text: `We’d much rather fix a problem than fight about it. This policy sets out how disputes are handled. It forms part of our Terms & Conditions.` },

    { t: "h", text: "Talk to us first" },
    { t: "p", text: `Before taking any formal action, please contact us at ${CONTACT_EMAIL} with the details of your concern. Most issues are resolved quickly this way. We’ll work with you in good faith to find a fair solution.` },

    { t: "h", text: "If we can’t resolve it" },
    { t: "p", text: "If we can’t resolve a dispute within a reasonable time (around 30 days), both of us agree to genuinely try to resolve it through negotiation or, if helpful, mediation before starting court proceedings — except where urgent relief is needed (for example to protect intellectual property)." },

    { t: "h", text: "Governing law and courts" },
    { t: "p", text: `These Terms and any dispute are governed by the laws of ${GOVERNING_STATE}, ${GOVERNING_COUNTRY}, and the courts of ${GOVERNING_STATE} have non-exclusive jurisdiction. “Non-exclusive” means you can still go to a court elsewhere if the law where you live gives you that right.` },

    { t: "h", text: "Your consumer rights are protected" },
    { t: "p", text: "Nothing in this policy removes or limits your rights under the Australian Consumer Law or any consumer-protection law that applies where you live. If you’re a consumer, you’re not required to give up those rights, your access to consumer tribunals or courts, or your right to complain to a regulator. Any part of our Terms that would do so doesn’t apply to the extent the law says it can’t." },

    { t: "h", text: "Regulators" },
    { t: "p", text: "Australian consumers can also contact their state/territory consumer-protection agency (in WA, Consumer Protection) or the ACCC. Privacy concerns can go to the Office of the Australian Information Commissioner (OAIC)." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// The ordered list used by the index/hub and the router.
// ─────────────────────────────────────────────────────────────────────────────
export const LEGAL_DOCS: LegalDoc[] = [
  privacy,
  terms,
  health,
  refunds,
  compliance,
  ip,
  infringement,
  ugc,
  cookies,
  accessibility,
  disputes,
];

export function getLegalDoc(slug: string | undefined): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
