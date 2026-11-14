/**
 * RANOJOY GHOSH — PORTFOLIO ENQUIRY BACKUP
 * Google Apps Script + Google Sheet
 *
 * WHAT IT DOES
 * Every "Get in Touch" form submission from your portfolio is also:
 *   1. Added as a row in this Google Sheet
 *   2. Emailed to you (optional — see NOTIFY_EMAIL below)
 *
 * ---------------------------------------------------------------
 * HOW TO INSTALL (5 minutes, once)
 * 1. Go to sheets.google.com → create a new blank sheet.
 *    Name it: Portfolio Enquiries
 * 2. In the sheet: Extensions → Apps Script
 * 3. Delete any code there and paste this ENTIRE file.
 * 4. (Optional) Change NOTIFY_EMAIL below if you want a different email.
 * 5. Click Deploy → New deployment
 *    - Select type (gear icon): Web app
 *    - Description: portfolio-form
 *    - Execute as: Me
 *    - Who has access: Anyone          ← must be "Anyone"
 *    - Click Deploy → Authorize access → choose your account →
 *      Advanced → Go to ... (unsafe) → Allow
 * 6. Copy the "Web app URL" (ends with /exec) and send it back —
 *    that URL gets wired into the website.
 *
 * NOTE: After editing this code later, always Deploy → Manage deployments
 * → Edit (pencil) → Version: New version → Deploy, or the changes won't go live.
 * ---------------------------------------------------------------
 */

// Emails you a copy of every enquiry (leave "" to disable emails)
const NOTIFY_EMAIL = "ranojoyghosh9999@gmail.com";

// Name of the tab inside the Google Sheet
const SHEET_NAME = "Enquiries";

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // Header row once
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Name", "Phone", "Email", "Service",
        "Budget", "Deadline", "Details"
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      p.name || "",
      p.phone || "",
      p.email || "",
      p.service || "",
      p.budget || "",
      p.deadline || "",
      p.details || ""
    ]);

    // Optional email notification
    if (NOTIFY_EMAIL) {
      const subject = "New project enquiry — " + (p.name || "Unknown") +
        " (" + (p.service || "no service set") + ")";
      const body =
        "New enquiry from your portfolio website\n" +
        "--------------------------------------\n" +
        "Name:     " + (p.name || "-") + "\n" +
        "Phone:    " + (p.phone || "-") + "\n" +
        "Email:    " + (p.email || "-") + "\n" +
        "Service:  " + (p.service || "-") + "\n" +
        "Budget:   " + (p.budget || "-") + "\n" +
        "Deadline: " + (p.deadline || "-") + "\n\n" +
        "Details:\n" + (p.details || "-") + "\n";
      MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
