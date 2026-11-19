# 181 Claisebrook Rd: self-managed leasing kit (DRAFT)

Hosted as a draft on GitHub Pages at https://181claisebrook.com.au (custom domain) and https://johnbreed.github.io/181claisebrook/. The yellow DRAFT banner and `noindex` tag are still in place. Lease from $60,000 p.a. + outgoings. Leased as the whole building only. The enquiry form is not connected yet (falls back to email). The form includes a required Budget field ($ per annum).

- index.html + img/: single-page listing site (static, no external dependencies).
- preview-desktop.png / preview-mobile.png: headless Chrome renders.
- apps-script.gs: Google Apps Script doPost. It appends form enquiries to the Sheet "181 Claisebrook Rd - Lease Inquiries" (tab "Inquiries"). Setup steps are at the top of the file. Not deployed.
- print/qr-code.png (1640 px) and print/qr-code.svg: point to https://181claisebrook.com.au
- print/sign-mockup.png: 2400x1200 sign mockup (2:1). FOR LEASE / 181 CLAISEBROOK RD, QR, and info@181claisebrook.com.au only — no phone number.

## Before going live (John)
1. Rent is shown as “Lease from $60,000 p.a. + outgoings”. Confirm availability (still marked TBC). Contact is info@181claisebrook.com.au; there is no phone number anywhere — enquiry form or email only.
2. Remove the `<meta name="robots" content="noindex">` line, the yellow DRAFT banner, and the robots.txt `Disallow: /` once ready to be found.
3. Deploy apps-script.gs as a web app and paste its /exec URL into the form action in index.html. The Sheet header should include a Budget column (replacing Area needed): Date received | Name | Business | Email | Phone | Intended use | Budget | Preferred start | Source | Status | Next action | Notes.
4. Optional: regenerate the QR with `?src=sign` so sign scans are tagged "sign/QR" in the Sheet, then regenerate the sign.
5. Check City of Vincent signage rules, and get lender (Granite) consent before any lease. Consent has been deferred by John.
