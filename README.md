# 181 Claisebrook Rd: self-managed leasing site

Live on GitHub Pages at https://181claisebrook.com.au (custom domain) and https://johnbreed.github.io/181claisebrook/.

Lease $60,000 p.a. + outgoings. Whole building only. Available immediately. Contact is the enquiry form, the on-page chat, or info@181claisebrook.com.au — no phone number.

- index.html + img/: single-page listing site.
- chat.css / chat.js: floating listing chat widget (Phase 1 scripted FAQ; Phase 2 LLM is prepared but off).
- preview-desktop.png / preview-mobile.png / preview-chat.png: page previews (chat preview is the widget open on a mobile viewport).
- apps-script.gs: Google Apps Script doPost. Appends form and chat enquiries to the Sheet "181 Claisebrook Rd - Lease Inquiries" (tab "Inquiries"). Setup steps are at the top of the file. Not deployed yet — until it is, the form and chat fall back to email.
- print/qr-code.png (1640 px) and print/qr-code.svg: point to https://181claisebrook.com.au
- print/sign-mockup.png: 2400x1200 sign mockup. FOR LEASE / 181 CLAISEBROOK RD, QR, and info@181claisebrook.com.au only — no phone number.
- robots.txt allows all and points at sitemap.xml (https://181claisebrook.com.au/).
- A “Floor plan coming soon” placeholder is on the page; there is no plan file yet.

## Enquiry form and chat leads
Required fields include “Your rent budget ($ per annum)”. Sheet columns:

Date received | Name | Business | Email | Phone | Intended use | Budget | Preferred start | Source | Status | Next action | Notes

Chat leads use Source = `chat`. Deploy apps-script.gs as a web app and paste its /exec URL into the form action in index.html. If the endpoint is still the placeholder or the post fails, both the form and the chat fall back to mailto:info@181claisebrook.com.au.

## Chat bot
Phase 1 (live now, no API key): the widget answers only from listing facts (rent, whole building only, size/specs, location, former NATA lab fit-out, approvals are the tenant’s responsibility, roller door fixed shut, inspections by appointment via email, available immediately). Keyword/intent matching and quick-reply buttons. Unknown questions get “I’ll pass that to the owner” and a lead form (name, email, intended use, rent budget p.a., message). It does not invent facts and does not show a phone number.

Phase 2 (prepared, not enabled): apps-script.gs has a `mode=chat` doPost path that calls the OpenAI Chat Completions API with a system prompt built from the same listing facts. The API key must be stored as the Script Property `OPENAI_API_KEY` (never in the repo). In chat.js, `USE_LLM` is false; set it to true only after the script is deployed with a key. Browser CORS on script.google.com may block reading the model’s reply — if that happens, leave Phase 1 on or add a CORS-friendly proxy.

Open the widget with `?chat=open` or `#chat` (used for the mobile preview screenshot).

## Still to do
1. Deploy apps-script.gs and paste the /exec URL into index.html (and re-test the form and chat lead).
2. Replace the floor-plan placeholder when a real plan is ready.
3. Check photo rights for the Colliers images, or replace them.
4. City of Vincent signage rules, and lender (Granite) consent before any lease (consent deferred by John).

## Inspection requests
Every “Book an inspection” CTA opens an inspection-request form (name, email, visitor phone, business, years in business, lease term, and why they're interested). It posts to Apps Script with `type=inspection` onto an Inspections tab, and emails John only (`john@envss.com.au` in the script — do not add other recipients). Until the web app URL is pasted into the form action, the form falls back to mailto:info@181claisebrook.com.au with the details prefilled. There is no self-serve calendar or slot picker.


## QR codes and visit tracking
Destination is always https://181claisebrook.com.au/ (with UTM query params). UTM codes were used rather than short `?s=` links: the QRs are 49 modules (vs 37 for the bare URL) and still scan cleanly at the sign size.

| Use | URL | Files |
| --- | --- | --- |
| Facade sign | https://181claisebrook.com.au/?utm_source=sign-facade&utm_medium=qr&utm_campaign=lease | print/qr/sign-facade.png, .svg |
| Post signs | https://181claisebrook.com.au/?utm_source=sign-posts&utm_medium=qr&utm_campaign=lease | print/qr/sign-posts.png, .svg |
| LinkedIn | https://181claisebrook.com.au/?utm_source=linkedin&utm_medium=paid-social&utm_campaign=lease | print/qr/linkedin.png, .svg |
| Facebook | https://181claisebrook.com.au/?utm_source=facebook&utm_medium=paid-social&utm_campaign=lease | print/qr/facebook.png, .svg |

The facade sign mockup with the tracking QR is print/sign-mockup-facade.png.

Short links on this domain (redirect to the UTM URLs above; existing QR files are unchanged):

- https://181claisebrook.com.au/facade
- https://181claisebrook.com.au/posts
- https://181claisebrook.com.au/li
- https://181claisebrook.com.au/fb
- https://181claisebrook.com.au/entrepreneurs-club
- https://181claisebrook.com.au/gumtree
- https://181claisebrook.com.au/marketplace


The site (track.js) stores a random visitor ID and first-touch UTMs in localStorage, updates last-touch, and once per session pings Apps Script with `type=visit` (only when the script URL is set). Inspection requests, enquiry form posts and chat leads include visitorId + UTM fields. Mailto fallbacks include a `Ref: <source>` line.

### Sheet tabs (after redeploying apps-script.gs and running setupTrackingSheets)
- **Visits** — Timestamp, Visitor ID, Source, Medium, Campaign, Content, Referrer, Path
- **Inspections** — the request fields plus Source, Medium, Campaign, Visitor ID, Status
- **Inquiries** — enquiry fields plus Form source, UTM Source, Medium, Campaign, Visitor ID
- **Summary** — per source: unique visiting IDs, inspection requests, conversion %. Refreshed automatically on each visit/inspection, or run `refreshSummary_`.

Notification emails go only to John (`NOTIFY_EMAIL` / `INSPECT_NOTIFY_EMAIL`). Do not add other recipients.

After updating Code.gs, deploy a new version of the existing web app (the /exec URL stays the same) and run `setupTrackingSheets` once from the editor to create headers and the Summary tab.
