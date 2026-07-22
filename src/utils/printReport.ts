import { t, type Locale } from '../i18n/translations'
import type { FoReport } from './materialReport'
import { formatPowerDbm, formatRupiah } from './materialReport'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildReportTableHtml(report: FoReport, locale: Locale): string {
  if (report.rows.length === 0) {
    const empty =
      report.kind === 'onuLoss' ? t(locale, 'reportEmptyOnu') : t(locale, 'reportEmptyNodes')
    return `<p class="report-empty">${escapeHtml(empty)}</p>`
  }

  if (report.kind === 'material') {
    const body = report.rows
      .map(
        (r) => `<tr>
          <td>${r.no}</td>
          <td>${escapeHtml(r.component)}</td>
          <td>${escapeHtml(r.brand)}</td>
          <td class="num">${r.qty}</td>
          <td class="num">${escapeHtml(formatRupiah(r.unitPrice))}</td>
          <td class="num">${escapeHtml(formatRupiah(r.total))}</td>
        </tr>`,
      )
      .join('')
    return `<div class="report-table-wrap">
      <table class="report-table">
        <thead>
          <tr>
            <th>${escapeHtml(t(locale, 'reportColNo'))}</th>
            <th>${escapeHtml(t(locale, 'reportColComponent'))}</th>
            <th>${escapeHtml(t(locale, 'settingsBrand'))}</th>
            <th>${escapeHtml(t(locale, 'reportColQty'))}</th>
            <th>${escapeHtml(t(locale, 'reportColUnitPrice'))}</th>
            <th>${escapeHtml(t(locale, 'reportColTotal'))}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr>
            <td colspan="5">${escapeHtml(t(locale, 'reportTotalMaterial'))}</td>
            <td class="num">${escapeHtml(formatRupiah(report.grandTotal))}</td>
          </tr>
        </tfoot>
      </table>
    </div>`
  }

  if (report.kind === 'quantity') {
    const body = report.rows
      .map(
        (r) => `<tr>
          <td>${r.no}</td>
          <td>${escapeHtml(r.component)}</td>
          <td>${escapeHtml(r.brand)}</td>
          <td class="num">${r.qty}</td>
        </tr>`,
      )
      .join('')
    return `<div class="report-table-wrap">
      <table class="report-table report-table-qty">
        <thead>
          <tr>
            <th>${escapeHtml(t(locale, 'reportColNo'))}</th>
            <th>${escapeHtml(t(locale, 'reportColComponent'))}</th>
            <th>${escapeHtml(t(locale, 'settingsBrand'))}</th>
            <th>${escapeHtml(t(locale, 'reportColQty'))}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">${escapeHtml(t(locale, 'reportTotalComponents'))}</td>
            <td class="num">${report.totalQty}</td>
          </tr>
        </tfoot>
      </table>
    </div>`
  }

  const body = report.rows
    .map(
      (r) => `<tr>
        <td>${r.no}</td>
        <td>${escapeHtml(r.label)}</td>
        <td>${escapeHtml(r.component)}</td>
        <td class="num">${escapeHtml(formatPowerDbm(r.receivedPower))}</td>
        <td>${escapeHtml(r.status)}</td>
        <td class="report-comment">${escapeHtml(r.comment)}</td>
      </tr>`,
    )
    .join('')
  return `<div class="report-table-wrap">
    <table class="report-table report-table-onu-loss">
      <thead>
        <tr>
          <th>${escapeHtml(t(locale, 'reportColNo'))}</th>
          <th>${escapeHtml(t(locale, 'label'))}</th>
          <th>${escapeHtml(t(locale, 'reportColComponent'))}</th>
          <th>${escapeHtml(t(locale, 'reportColRx'))}</th>
          <th>${escapeHtml(t(locale, 'reportColStatus'))}</th>
          <th>${escapeHtml(t(locale, 'reportColComment'))}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>`
}

/** Mirror ReportPanel.css so print matches the on-screen report. */
const PRINT_CSS = `
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'IBM Plex Sans', 'Segoe UI', Tahoma, sans-serif;
    color: #111827;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .report-head {
    margin-bottom: 14px;
  }
  .report-head h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #111827;
  }
  .report-meta {
    margin: 4px 0 0;
    font-size: 12px;
    color: #6b7280;
  }
  .report-empty {
    margin: 24px 0;
    text-align: center;
    color: #6b7280;
    font-size: 13px;
  }
  .report-table-wrap {
    overflow: visible;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }
  .report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .report-table th,
  .report-table td {
    padding: 9px 12px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: top;
    color: #111827;
  }
  .report-table th {
    background: #f3f4f6;
    font-weight: 700;
    color: #4b5563;
    white-space: nowrap;
  }
  .report-table td.num,
  .report-table th:nth-child(n + 4) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .report-table-qty th:nth-child(4),
  .report-table-qty td:nth-child(4) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .report-table-onu-loss th:nth-child(4),
  .report-table-onu-loss td:nth-child(4) {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .report-table-onu-loss th:nth-child(n + 5),
  .report-table-onu-loss td:nth-child(n + 5) {
    text-align: left;
    font-variant-numeric: normal;
  }
  .report-comment {
    max-width: 280px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #4b5563;
  }
  .report-table tfoot td {
    font-weight: 700;
    background: #ecfdf5;
    border-bottom: none;
  }
  .report-table tbody tr:last-child td {
    border-bottom-color: #e5e7eb;
  }
`

/**
 * Cetak laporan di iframe terpisah agar tabel selalu ikut (tanpa bergantung CSS print app).
 */
export function printFoReport(report: FoReport): void {
  const locale: Locale = report.locale ?? 'id'
  const tableHtml = buildReportTableHtml(report, locale)
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="report-head">
    <h1>${escapeHtml(report.title)}</h1>
    <p class="report-meta">${escapeHtml(report.projectTitle)} · ${escapeHtml(report.generatedAt)}</p>
  </div>
  ${tableHtml}
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (!win || !doc) {
    document.body.removeChild(iframe)
    throw new Error('Print frame unavailable')
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    try {
      document.body.removeChild(iframe)
    } catch {
      /* ignore */
    }
  }

  const runPrint = () => {
    try {
      win.focus()
      win.print()
    } finally {
      // beri waktu dialog print muncul sebelum frame dihapus
      window.setTimeout(cleanup, 1000)
    }
  }

  // tunggu layout iframe siap
  if (doc.readyState === 'complete') {
    window.setTimeout(runPrint, 50)
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 50)
  }
}
