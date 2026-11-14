# Form backup — Google Apps Script → Google Sheet (5-minute setup)

The Get in Touch form always opens WhatsApp. This optional backup also saves
every enquiry to a Google Sheet **and** emails you a copy.

## Setup

1. Create a new blank Google Sheet at [sheets.google.com](https://sheets.google.com) → name it `Portfolio Enquiries`.
2. In the sheet open **Extensions → Apps Script**.
3. Delete the sample code, paste the whole contents of [`Code.gs`](./Code.gs) and save.
4. **Deploy → New deployment**
   - gear icon → type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← required, or the website can't reach it
   - Deploy → **Authorize access** → your account → *Advanced → Go to … (unsafe) → Allow*
5. Copy the Web app URL (ends in `/exec`).

## Connect the website

Send that `/exec` URL back — it gets added as `REACT_APP_GOOGLE_SCRIPT_URL` in
`.env` and the form starts double-delivering automatically. The URL is
not a secret key (it's a public form endpoint, like a Formspree form ID), so it
is safe to keep in the static site.

## Test it

Open the site → fill the form → Send via WhatsApp. Within seconds you should see
a new row in the **Enquiries** tab and an email in your inbox.

## Editing the script later

After changing `Code.gs`: **Deploy → Manage deployments → pencil icon →
Version: New version → Deploy** — otherwise edits don't go live.
