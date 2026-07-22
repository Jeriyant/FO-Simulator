import { FileSpreadsheet, Printer, X } from 'lucide-react'
import { useI18n } from '../i18n/context'
import type { FoReport } from '../utils/materialReport'
import { formatPowerDbm, formatRupiah } from '../utils/materialReport'
import { exportReportToExcel } from '../utils/exportReportExcel'
import { printFoReport } from '../utils/printReport'
import './ReportPanel.css'

type Props = {
  report: FoReport
  onClose: () => void
}

export function ReportPanel({ report, onClose }: Props) {
  const { t } = useI18n()

  const handlePrint = () => {
    try {
      printFoReport(report)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('print')
      window.alert(message)
    }
  }

  const handleExcel = () => {
    void (async () => {
      try {
        await exportReportToExcel(report)
      } catch (err) {
        const message = err instanceof Error ? err.message : t('excelFail')
        window.alert(message)
      }
    })()
  }

  const emptyMessage =
    report.kind === 'onuLoss' ? t('reportEmptyOnu') : t('reportEmptyNodes')

  return (
    <div className="report-overlay" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="report-panel">
        <div className="report-head">
          <div>
            <h2 id="report-title">{report.title}</h2>
            <p className="report-meta">
              {report.projectTitle} · {report.generatedAt}
            </p>
          </div>
          <div className="report-actions">
            <button type="button" className="btn-save" onClick={handlePrint}>
              <Printer size={15} />
              {t('print')}
            </button>
            <button
              type="button"
              className="btn-excel"
              onClick={handleExcel}
              disabled={report.rows.length === 0}
              title={t('excelExportTitle')}
            >
              <FileSpreadsheet size={15} />
              {t('excel')}
            </button>
            <button type="button" className="btn-close" onClick={onClose} aria-label={t('close')}>
              <X size={16} />
              {t('close')}
            </button>
          </div>
        </div>

        {report.rows.length === 0 ? (
          <p className="report-empty">{emptyMessage}</p>
        ) : report.kind === 'material' ? (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('reportColNo')}</th>
                  <th>{t('reportColComponent')}</th>
                  <th>{t('settingsBrand')}</th>
                  <th>{t('reportColQty')}</th>
                  <th>{t('reportColUnitPrice')}</th>
                  <th>{t('reportColTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={`${row.no}-${row.component}-${row.brand}-${row.unitPrice}`}>
                    <td>{row.no}</td>
                    <td>{row.component}</td>
                    <td>{row.brand}</td>
                    <td className="num">{row.qty}</td>
                    <td className="num">{formatRupiah(row.unitPrice)}</td>
                    <td className="num">{formatRupiah(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>{t('reportTotalMaterial')}</td>
                  <td className="num">{formatRupiah(report.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : report.kind === 'quantity' ? (
          <div className="report-table-wrap">
            <table className="report-table report-table-qty">
              <thead>
                <tr>
                  <th>{t('reportColNo')}</th>
                  <th>{t('reportColComponent')}</th>
                  <th>{t('settingsBrand')}</th>
                  <th>{t('reportColQty')}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={`${row.no}-${row.component}-${row.brand}`}>
                    <td>{row.no}</td>
                    <td>{row.component}</td>
                    <td>{row.brand}</td>
                    <td className="num">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>{t('reportTotalComponents')}</td>
                  <td className="num">{report.totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table report-table-onu-loss">
              <thead>
                <tr>
                  <th>{t('reportColNo')}</th>
                  <th>{t('label')}</th>
                  <th>{t('reportColComponent')}</th>
                  <th>{t('reportColRx')}</th>
                  <th>{t('reportColStatus')}</th>
                  <th>{t('reportColComment')}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={`${row.no}-${row.label}`}>
                    <td>{row.no}</td>
                    <td>{row.label}</td>
                    <td>{row.component}</td>
                    <td className="num">{formatPowerDbm(row.receivedPower)}</td>
                    <td>{row.status}</td>
                    <td className="report-comment">{row.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
