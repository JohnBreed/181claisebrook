/**
 * 181 Claisebrook Rd: lease inquiry form → Google Sheet
 * DRAFT. Not deployed.
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
 * (Budget is the applicant's rent budget, $ per annum. The property is leased as the whole building only.)
 */
const SHEET_NAME = 'Inquiries';   // tab name in the Sheet
const NOTIFY_EMAIL = '';          // e.g. 'john@example.com'; leave blank to skip

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.website_hp) return json_({ ok: true });            // honeypot: likely a bot
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

function doGet() { return json_({ ok: true, info: '181 Claisebrook inquiry endpoint' }); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
