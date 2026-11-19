/**
 * 181 Claisebrook Rd: enquiries, inspection requests, visit tracking -> Google Sheet
 *
 * SETUP:
 * 1. Open the Sheet "181 Claisebrook Rd - Lease Inquiries" > Extensions > Apps Script.
 * 2. Paste this whole file into Code.gs and save.
 * 3. Deploy > New deployment (or new version of the existing deployment) > type "Web app".
 *      Execute as: Me (John)        Who has access: Anyone
 * 4. Authorise when prompted. The current web app URL is:
 *      https://script.google.com/macros/s/AKfycbxO2Oad6DE02EYhZ8oTmFoC73qbv1-O5A7sX9zUHF0Gx0D0F03sWwr09BeFyJWHaQyL/exec
 *    That URL is already set as the form action in index.html.
 * 5. Run setupTrackingSheets() once from the editor to create/refresh
 *    the Visits, Inspections, Inquiries and Summary tabs/headers.
 *
 * Notifications go only to NOTIFY_EMAIL (John). Do not add other recipients.
 *
 * Inquiries columns:
 * Date received | Name | Business | Email | Phone | Intended use | Budget |
 * Preferred start | Form source | UTM Source | Medium | Campaign | Visitor ID |
 * Status | Next action | Notes
 *
 * Inspections columns:
 * Timestamp | Name | Email | Phone | Business | Years in business | Lease term |
 * Note | Source | Medium | Campaign | Visitor ID | Status
 *
 * Visits columns:
 * Timestamp | Visitor ID | Source | Medium | Campaign | Content | Referrer | Path
 *
 * Summary (refreshed on each visit/inspection, or run refreshSummary_):
 * Source | Visits (unique visitors) | Inspection requests | Conversion %
 */

const SHEET_NAME = 'Inquiries';
const NOTIFY_EMAIL = 'john@envss.com.au';
const INSPECT_SHEET = 'Inspections';
const INSPECT_NOTIFY_EMAIL = 'john@envss.com.au';
const VISIT_SHEET = 'Visits';
const SUMMARY_SHEET = 'Summary';

const INQUIRY_HEADERS = [
  'Date received', 'Name', 'Business', 'Email', 'Phone', 'Intended use', 'Budget',
  'Preferred start', 'Form source', 'UTM Source', 'Medium', 'Campaign', 'Visitor ID',
  'Status', 'Next action', 'Notes'
];
const INSPECT_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Business', 'Years in business', 'Lease term',
  'Note', 'Source', 'Medium', 'Campaign', 'Visitor ID', 'Status'
];
const VISIT_HEADERS = [
  'Timestamp', 'Visitor ID', 'Source', 'Medium', 'Campaign', 'Content', 'Referrer', 'Path'
];
const KNOWN_SOURCES = ['sign-facade', 'sign-posts', 'linkedin', 'facebook', 'entrepreneurs-club', '(direct)'];

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
    if (p.website_hp) return json_({ ok: true });
    if (p.type === 'visit') return recordVisit_(p);
    if (p.type === 'inspection') return recordInspection_(p);
    if (p.mode === 'chat') return chatLlm_(p);
    if (!p.name || !p.email || !p.budget) return json_({ ok: false, error: 'missing fields' });

    const clean = v => String(v || '').slice(0, 2000).replace(/^[=+\-@]/, "'$&");
    const ss = SpreadsheetApp.getActive();
    const sheet = ensureSheet_(ss, SHEET_NAME, INQUIRY_HEADERS);
    appendByHeader_(sheet, INQUIRY_HEADERS, {
      'Date received': new Date(),
      'Name': clean(p.name),
      'Business': clean(p.business),
      'Email': clean(p.email),
      'Phone': p.phone ? "'" + clean(p.phone) : '',
      'Intended use': clean(p.intended_use),
      'Budget': clean(p.budget),
      'Preferred start': clean(p.preferred_start),
      'Form source': clean(p.source || 'website'),
      'UTM Source': clean(p.utm_source),
      'Medium': clean(p.utm_medium),
      'Campaign': clean(p.utm_campaign),
      'Visitor ID': clean(p.visitorId),
      'Status': 'New',
      'Next action': 'Reply and offer an inspection',
      'Notes': clean(p.message)
    });

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(
        NOTIFY_EMAIL,
        'New lease enquiry: 181 Claisebrook Rd (' + clean(p.business) + ')',
        [
          'Name: ' + p.name, 'Business: ' + p.business, 'Email: ' + p.email, 'Phone: ' + p.phone,
          'Use: ' + p.intended_use, 'Budget: ' + p.budget, 'Start: ' + p.preferred_start,
          'Form source: ' + (p.source || 'website'),
          'Ref: ' + (p.utm_source || '(direct)'),
          'Visitor ID: ' + (p.visitorId || ''),
          '', p.message
        ].join('\n')
      );
    }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

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


function recordInspection_(p) {
  const clean = v => String(v || '').slice(0, 2000).replace(/^[=+\-@]/, "'$&");
  if (!p.name || !p.email || !p.phone || !p.business || !p.yearsInBusiness || !p.leaseTerm || !p.note) {
    return json_({ ok: false, error: 'missing fields' });
  }
  const ss = SpreadsheetApp.getActive();
  const sheet = ensureSheet_(ss, INSPECT_SHEET, INSPECT_HEADERS);
  appendByHeader_(sheet, INSPECT_HEADERS, {
    'Timestamp': new Date(),
    'Name': clean(p.name),
    'Email': clean(p.email),
    'Phone': p.phone ? "'" + clean(p.phone) : '',
    'Business': clean(p.business),
    'Years in business': clean(p.yearsInBusiness),
    'Lease term': clean(p.leaseTerm),
    'Note': clean(p.note),
    'Source': clean(p.utm_source || '(direct)'),
    'Medium': clean(p.utm_medium),
    'Campaign': clean(p.utm_campaign),
    'Visitor ID': clean(p.visitorId),
    'Status': 'New'
  });
  if (INSPECT_NOTIFY_EMAIL) {
    MailApp.sendEmail(
      INSPECT_NOTIFY_EMAIL,
      'Inspection request: 181 Claisebrook Rd (' + clean(p.name) + ')',
      [
        'Name: ' + p.name,
        'Email: ' + p.email,
        'Phone: ' + p.phone,
        'What does your business do?: ' + p.business,
        'How long have you been in business?: ' + p.yearsInBusiness,
        'What lease term are you after?: ' + p.leaseTerm,
        'Why are you interested in leasing?: ' + p.note,
        'Ref: ' + (p.utm_source || '(direct)'),
        'Visitor ID: ' + (p.visitorId || '')
      ].join('\n')
    );
  }
  refreshSummary_();
  return json_({ ok: true });
}

function recordVisit_(p) {
  const clean = v => String(v || '').slice(0, 2000).replace(/^[=+\-@]/, "'$&");
  if (!p.visitorId) return json_({ ok: false, error: 'missing visitorId' });
  const ss = SpreadsheetApp.getActive();
  const sheet = ensureSheet_(ss, VISIT_SHEET, VISIT_HEADERS);
  appendByHeader_(sheet, VISIT_HEADERS, {
    'Timestamp': p.ts ? new Date(Number(p.ts) || p.ts) : new Date(),
    'Visitor ID': clean(p.visitorId),
    'Source': clean(p.utm_source || '(direct)'),
    'Medium': clean(p.utm_medium),
    'Campaign': clean(p.utm_campaign),
    'Content': clean(p.utm_content),
    'Referrer': clean(p.referrer),
    'Path': clean(p.path)
  });
  refreshSummary_();
  return json_({ ok: true });
}

/** Run once from the Apps Script editor after redeploying. */
function setupTrackingSheets() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEET_NAME, INQUIRY_HEADERS);
  ensureSheet_(ss, INSPECT_SHEET, INSPECT_HEADERS);
  ensureSheet_(ss, VISIT_SHEET, VISIT_HEADERS);
  refreshSummary_();
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const have = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (have.join('\0') === headers.join('\0')) return sheet;
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }
  headers.forEach(function (h) {
    if (have.indexOf(h) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      have.push(h);
    }
  });
  return sheet;
}

function headerMap_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const have = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  have.forEach(function (h, i) { if (h) map[String(h)] = i; });
  return map;
}

function appendByHeader_(sheet, headers, record) {
  const map = headerMap_(sheet);
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const row = new Array(width).fill('');
  Object.keys(record).forEach(function (h) {
    if (map[h] != null) row[map[h]] = record[h];
  });
  sheet.appendRow(row);
}

function colValues_(sheet, header) {
  const map = headerMap_(sheet);
  if (map[header] == null || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, map[header] + 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; });
}

function refreshSummary_() {
  const ss = SpreadsheetApp.getActive();
  let tab = ss.getSheetByName(SUMMARY_SHEET);
  if (!tab) tab = ss.insertSheet(SUMMARY_SHEET);
  const visits = ss.getSheetByName(VISIT_SHEET);
  const inspections = ss.getSheetByName(INSPECT_SHEET);

  const visitSources = visits ? colValues_(visits, 'Source') : [];
  const visitIds = visits ? colValues_(visits, 'Visitor ID') : [];
  const inspectSources = inspections ? colValues_(inspections, 'Source') : [];

  const uniqueBySource = {};
  visitSources.forEach(function (src, i) {
    const key = String(src || '(direct)');
    if (!uniqueBySource[key]) uniqueBySource[key] = {};
    const id = String(visitIds[i] || '');
    if (id) uniqueBySource[key][id] = true;
  });
  const inspectCount = {};
  inspectSources.forEach(function (src) {
    const key = String(src || '(direct)');
    inspectCount[key] = (inspectCount[key] || 0) + 1;
  });

  const sources = KNOWN_SOURCES.slice();
  Object.keys(uniqueBySource).concat(Object.keys(inspectCount)).forEach(function (s) {
    if (sources.indexOf(s) === -1) sources.push(s);
  });

  const rows = [['Source', 'Visits (unique visitors)', 'Inspection requests', 'Conversion %']];
  sources.forEach(function (s) {
    const v = uniqueBySource[s] ? Object.keys(uniqueBySource[s]).length : 0;
    const n = inspectCount[s] || 0;
    const pct = v === 0 ? '-' : (Math.round((n / v) * 1000) / 10) + '%';
    rows.push([s, v, n, pct]);
  });
  tab.clear();
  tab.getRange(1, 1, rows.length, 4).setValues(rows);
  tab.getRange(1, 1, 1, 4).setFontWeight('bold');
  tab.getRange(rows.length + 2, 1, 1, 2).setValues([['Last refreshed', new Date()]]);
}

function doGet() { return json_({ ok: true, info: '181 Claisebrook inquiry endpoint' }); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
