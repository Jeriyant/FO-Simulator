import { t, type Locale } from '../i18n/translations'
import type { FoReport } from './materialReport'
import { formatLossDb, formatPowerDbm, formatRupiah } from './materialReport'

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
    return `<p class="empty">${escapeHtml(empty)}</p>`
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
    return `<table>
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
    </table>`
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
    return `<table>
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
    </table>`
  }

  const body = report.rows
    .map(
      (r) => `<tr>
        <td>${r.no}</td>
        <td>${escapeHtml(r.label)}</td>
        <td>${escapeHtml(r.component)}</td>
        <td>${escapeHtml(r.status)}</td>
        <td class="num">${escapeHtml(formatPowerDbm(r.receivedPower))}</td>
        <td class="num">${escapeHtml(formatLossDb(r.loss))}</td>
        <td>${escapeHtml(r.comment)}</td>
      </tr>`,
    )
    .join('')
  return `<table>
    <thead>
      <tr>
        <th>${escapeHtml(t(locale, 'reportColNo'))}</th>
        <th>${escapeHtml(t(locale, 'label'))}</th>
        <th>${escapeHtml(t(locale, 'reportColComponent'))}</th>
        <th>${escapeHtml(t(locale, 'reportColStatus'))}</th>
        <th>${escapeHtml(t(locale, 'reportColRx'))}</th>
        <th>${escapeHtml(t(locale, 'reportColLoss'))}</th>
        <th>${escapeHtml(t(locale, 'reportColComment'))}</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`
}

const PRINT_CSS = `
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', Tahoma, sans-serif;
    color: #111;
    background: #fff;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  .meta {
    margin: 0 0 16px;
    font-size: 12px;
    color: #555;
  }
  .empty {
    text-align: center;
    color: #666;
    margin: 24px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f3f4f6;
    font-weight: 700;
  }
  td.num, th.num { text-align: right; }
  tfoot td {
    font-weight: 700;
    background: #ecfdf5;
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
  <h1>${escapeHtml(report.title)}</h1>
  <p class="meta">${escapeHtml(report.projectTitle)} · ${escapeHtml(report.generatedAt)}</p>
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
