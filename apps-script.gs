/**
 * 181 Claisebrook Rd: lease inquiry form + optional Phase 2 chat → Google Sheet
 *
 * SETUP (about 5 minutes, done by John in his own Google account):
 * 1. Open the Sheet "181 Claisebrook Rd - Lease Inquiries" > Extensions > Apps Script.
 * 2. Paste this whole file into Code.gs and save.
 * 3. Deploy > New deployment > type "Web app".
 *      Execute as: Me (John)        Who has access: Anyone
 *    (The form needs "Anyone" access to post. The Sheet itself stays private.)
 * 4. Authorise when prompted, then copy the Web app URL (…/macros/s/XXXX/exec).
 * 5. In index.html, replace
 *      https://script.google.com/macros/s/REPLACE-WITH-DEPLOYMENT-ID/exec
 *    with that URL. Submit a test enquiry and check that a row appears.
 * 6. Optional: set NOTIFY_EMAIL below to get an email for each new enquiry.
 *
 * Column order matches the Sheet header:
 * Date received | Name | Business | Email | Phone | Intended use | Budget |
 * Preferred start | Source | Status | Next action | Notes
 * (Budget is the applicant's rent budget, $ per annum. The property is leased as the whole building only.
 *  Chat leads arrive with Source = "chat".)
 *
 * PHASE 2 (LLM chat — prepared, not enabled):
 * The widget (chat.js) uses a scripted FAQ unless USE_LLM is set to true.
 * To enable later:
 *   a) Project Settings > Script Properties > add OPENAI_API_KEY (never commit the key).
 *   b) Redeploy this script.
 *   c) In chat.js, set USE_LLM = true.
 * A POST with mode=chat and message=... calls OpenAI with the listing-facts system
 * prompt below and returns { ok, reply }. Browser CORS on script.google.com can
 * block reading the response; if that happens, keep USE_LLM false or add a
 * CORS-friendly proxy. Lead capture (source=chat) always uses the form path, not the LLM path.
 */
const SHEET_NAME = 'Inquiries';   // tab name in the Sheet
const NOTIFY_EMAIL = '';          // e.g. 'john@example.com'; leave blank to skip

const LISTING_SYSTEM_PROMPT =
  'You are a listing assistant for a commercial property at 181 Claisebrook Road, Perth WA 6000 ' +
  '(Claisebrook precinct, East Perth, City of Vincent). Answer only from these facts. ' +
  'If you do not know, say you will pass the question to the owner and invite the visitor to leave their details. Never invent facts. Do not give a phone number. Contact is email info@181claisebrook.com.au, the enquiry form, or the on-page chat. ' +
  'Facts: Lease from $60,000 p.a. + outgoings. Whole building only (approx. 280 sqm); not available in part. ' +
  'Building approx. 280 sqm, single level, on 468 sqm of land, frontage 13.66 m. Areas are approximate. ' +
  'Single-level converted office/warehouse, currently fitted out as food laboratories. ' +
  '3 on-site car bays plus street parking nearby. 3-phase power. Air conditioning. Monitored alarm system. ' +
  'Fit-out: reception, individual meeting rooms and offices, open-plan lab areas with stainless benching, cool room, staff amenities, storeroom/archive and wash rooms. ' +
  'Front roller door currently fixed shut; condition to be confirmed. ' +
  'A cool room is on site; ask about its current condition and servicing. ' +
  'Previously home to a NATA-accredited laboratory for about 25 years. ' +
  'Suits food production, a commercial kitchen, meal prep, catering or a NATA-style lab. Can be stripped back to open office/warehouse by negotiation. Lease term and incentives by negotiation. ' +
  'Available immediately. Inspections by appointment via email or the enquiry form/chat. ' +
  'The tenant is responsible for getting and keeping its own planning/use approvals, licences and registrations, for any fit-out works (with the landlord\'s consent), and for make-good at the end of the lease. Information is indicative only and does not form part of any lease. ' +
  'Approximate distances from the sale information memorandum (Dec 2025): 400 m Claisebrook train station, 550 m Graham Farmer Fwy on/off, 1.4 km Perth CBD, 1.5 km Northbridge, 800 m Swan River, 1.5 km Optus Stadium. ' +
  'A floor plan is coming soon; none is published yet.';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.website_hp) return json_({ ok: true });            // honeypot: likely a bot
    if (p.mode === 'chat') return chatLlm_(p);               // Phase 2 LLM path
    if (!p.name || !p.email || !p.budget) return json_({ ok: false, error: 'missing fields' });

    const clean = v => String(v || '').slice(0, 2000).replace(/^[=+\-@]/, "'$&"); // stop formula injection
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    sheet.appendRow([
      new Date(),
      clean(p.name), clean(p.business), clean(p.email), clean(p.phone),
      clean(p.intended_use), clean(p.budget), clean(p.preferred_start),
      clean(p.source || 'website'),
      'New', 'Reply and offer an inspection', clean(p.message)
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'New lease enquiry: 181 Claisebrook Rd (' + clean(p.business) + ')',
        ['Name: ' + p.name, 'Business: ' + p.business, 'Email: ' + p.email, 'Phone: ' + p.phone,
         'Use: ' + p.intended_use, 'Budget: ' + p.budget, 'Start: ' + p.preferred_start,
         'Source: ' + p.source, '', p.message].join('\n'));
    }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Phase 2: optional LLM reply. Requires Script Property OPENAI_API_KEY.
 * Not used by the widget until chat.js USE_LLM is true.
 */
function chatLlm_(p) {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) return json_({ ok: false, error: 'LLM not configured' });
  const message = String((p && p.message) || '').slice(0, 2000);
  if (!message) return json_({ ok: false, error: 'missing message' });

  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: LISTING_SYSTEM_PROMPT },
      { role: 'user', content: message }
    ]
  };
  const resp = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const body = JSON.parse(resp.getContentText() || '{}');
  const reply = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
  if (resp.getResponseCode() !== 200 || !reply) {
    return json_({ ok: false, error: 'LLM request failed' });
  }
  return json_({ ok: true, reply: String(reply).slice(0, 4000) });
}

function doGet() { return json_({ ok: true, info: '181 Claisebrook inquiry endpoint' }); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
