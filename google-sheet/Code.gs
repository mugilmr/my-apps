/**
 * RENT ROLL - Google Sheet back end
 *
 * This script lives inside your Google Sheet (Extensions > Apps Script).
 * The Rent Roll app saves its data into the "Data" tab and reads it back, so
 * every phone sees the same thing. Four readable tabs are refreshed for you:
 *   This month, Pending, Payments, Tenants.
 * Do not edit the "Data" tab by hand. Make all changes in the app.
 *
 * 1) Change the passcode below to your own long passcode.
 * 2) Deploy > New deployment > type: Web app
 *      Execute as: Me      Who has access: Anyone
 * 3) Copy the Web app URL (ends in /exec) into rent/sheets-config.js.
 */
const PASSCODE = 'CHANGE-THIS-PASSCODE';

const CHUNK = 45000;                      // a cell holds up to 50,000 characters
const REPORT_TABS = ['This month', 'Pending', 'Payments', 'Tenants'];

function doGet() { return out_({ ok: true, app: 'Rent Roll' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad request' }); }
  if (!req || req.key !== PASSCODE) return out_({ ok: false, error: 'auth' });
  try {
    if (req.action === 'sync') return out_(sync_(Number(req.since) || 0));
    if (req.action === 'set') return out_(setDoc_(req.name, req.data));
    if (req.action === 'report') return out_(report_(req.tabs));
    if (req.action === 'ping') return out_({ ok: true });
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function dataSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Data');
  if (!sh) {
    sh = ss.insertSheet('Data');
    sh.getRange(1, 1, 1, 3).setValues([['name', 'updated', 'data (do not edit)']]);
    sh.setTabColor('#999999');
    sh.setFrozenRows(1);
  }
  return sh;
}

// name -> {row, upd}
function index_(sh) {
  const n = sh.getLastRow(), o = {};
  if (n < 2) return o;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r, i) { o[r[0]] = { row: i + 2, upd: Number(r[1]) || 0 }; });
  return o;
}

// Version = newest change time. Kept in the cache so a "nothing new" check is very cheap.
function version_() {
  const cache = CacheService.getScriptCache(), c = cache.get('ver');
  if (c !== null) return Number(c);
  const idx = index_(dataSheet_());
  let v = 0;
  Object.keys(idx).forEach(function (k) { v = Math.max(v, idx[k].upd); });
  cache.put('ver', String(v), 21600);
  return v;
}

function sync_(since) {
  const ver = version_();
  if (ver <= since) return { ok: true, ver: ver, docs: {} };
  const sh = dataSheet_(), n = sh.getLastRow(), docs = {};
  if (n >= 2) {
    sh.getRange(2, 1, n - 1, Math.max(3, sh.getLastColumn())).getValues().forEach(function (r) {
      if (Number(r[1]) > since) {
        const json = r.slice(2).filter(function (x) { return x !== ''; }).map(function (x) { return String(x).slice(1); }).join('');
        if (json) docs[r[0]] = JSON.parse(json);
      }
    });
  }
  return { ok: true, ver: ver, docs: docs };
}

function setDoc_(name, data) {
  if (!/^(core|pay_\d{4}-\d{2})$/.test(String(name))) throw new Error('bad name');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = dataSheet_(), idx = index_(sh), json = JSON.stringify(data), chunks = [];
    for (let i = 0; i < json.length; i += CHUNK) chunks.push('J' + json.slice(i, i + CHUNK));   // "J" keeps Sheets from turning text into numbers
    const now = Math.max(Date.now(), version_() + 1);
    const row = idx[name] ? idx[name].row : sh.getLastRow() + 1;
    const width = Math.max(sh.getLastColumn(), 2 + chunks.length);
    if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
    if (sh.getMaxRows() < row) sh.insertRowsAfter(sh.getMaxRows(), row - sh.getMaxRows());
    const vals = [name, now].concat(chunks);
    while (vals.length < width) vals.push('');
    sh.getRange(row, 1, 1, width).setValues([vals]);
    CacheService.getScriptCache().put('ver', String(now), 21600);
    return { ok: true, ver: now };
  } finally {
    lock.releaseLock();
  }
}

// The app sends ready-made tables; we only paste them into the readable tabs.
function report_(tabs) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    REPORT_TABS.forEach(function (name) {
      const rows = tabs && tabs[name];
      if (!rows || !rows.length) return;
      const sh = ss.getSheetByName(name) || ss.insertSheet(name);
      sh.clear();
      const w = rows[0].length;
      if (sh.getMaxRows() < rows.length) sh.insertRowsAfter(sh.getMaxRows(), rows.length - sh.getMaxRows());
      if (sh.getMaxColumns() < w) sh.insertColumnsAfter(sh.getMaxColumns(), w - sh.getMaxColumns());
      sh.getRange(1, 1, rows.length, w).setValues(rows);
      sh.getRange(1, 1, 1, w).setFontWeight('bold').setBackground('#DDE3F3');
      sh.setFrozenRows(1);
      sh.autoResizeColumns(1, w);
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
