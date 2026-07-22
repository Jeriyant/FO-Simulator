import type { FoReport } from './materialReport'
import { formatPowerDbm } from './materialReport'
import { slugifyFilename } from './projectFile'
import { t, type Locale } from '../i18n/translations'

function downloadWorkbook(data: ArrayBuffer, filename: string) {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Export laporan aktif ke file .xlsx (Excel). */
export async function exportReportToExcel(report: FoReport): Promise<void> {
  const XLSX = await import('xlsx')
  const locale: Locale = report.locale ?? 'id'

  const meta: (string | number)[][] = [
    [report.title],
    [`${t(locale, 'excelProject')}: ${report.projectTitle}`],
    [`${t(locale, 'excelCreated')}: ${report.generatedAt}`],
    [],
  ]

  let table: (string | number)[][]
  let sheetName: string
  let fileSuffix: string

  if (report.kind === 'material') {
    sheetName = t(locale, 'excelSheetMaterial')
    fileSuffix = 'material-biaya'
    table = [
      [
        t(locale, 'reportColNo'),
        t(locale, 'reportColComponent'),
        t(locale, 'settingsBrand'),
        t(locale, 'reportColQty'),
        t(locale, 'reportColUnitPrice'),
        t(locale, 'reportColTotal'),
      ],
      ...report.rows.map((r) => [r.no, r.component, r.brand, r.qty, r.unitPrice, r.total]),
      [],
      ['', '', '', '', t(locale, 'reportTotalMaterial'), report.grandTotal],
    ]
  } else if (report.kind === 'quantity') {
    sheetName = t(locale, 'excelSheetQuantity')
    fileSuffix = 'rekap-jumlah'
    table = [
      [
        t(locale, 'reportColNo'),
        t(locale, 'reportColComponent'),
        t(locale, 'settingsBrand'),
        t(locale, 'reportColQty'),
      ],
      ...report.rows.map((r) => [r.no, r.component, r.brand, r.qty]),
      [],
      ['', '', t(locale, 'reportTotalComponents'), report.totalQty],
    ]
  } else {
    sheetName = t(locale, 'excelSheetOnuLoss')
    fileSuffix = 'redaman-onu'
    table = [
      [
        t(locale, 'reportColNo'),
        t(locale, 'label'),
        t(locale, 'reportColComponent'),
        t(locale, 'reportColRx'),
        t(locale, 'reportColStatus'),
        t(locale, 'reportColComment'),
      ],
      ...report.rows.map((r) => [
        r.no,
        r.label,
        r.component,
        formatPowerDbm(r.receivedPower),
        r.status,
        r.comment,
      ]),
    ]
  }

  const rows = [...meta, ...table]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const colCount = Math.max(...rows.map((r) => r.length), 1)
  ws['!cols'] = Array.from({ length: colCount }, (_, i) => {
    const maxLen = rows.reduce((m, r) => Math.max(m, String(r[i] ?? '').length), 8)
    return { wch: Math.min(40, Math.max(10, maxLen + 2)) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const base = slugifyFilename(report.projectTitle || 'laporan')
  downloadWorkbook(data, `${base}-${fileSuffix}.xlsx`)
}
