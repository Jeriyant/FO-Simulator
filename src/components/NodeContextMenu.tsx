import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  ChevronRight,
  Copy,
  LayoutGrid,
  Settings,
  Trash2,
  Unplug,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/translations'
import type { ArrangeMode } from '../utils/nodeLayout'
import './NodeContextMenu.css'

export type ContextMenuState =
  | { kind: 'node'; x: number; y: number; id: string; selectedIds: string[] }
  | { kind: 'edge'; x: number; y: number; id: string }
  | null

type ArrangeItem = {
  mode: ArrangeMode
  labelKey: TranslationKey
  icon: typeof AlignStartHorizontal
  minCount: number
}

const ARRANGE_ITEMS: ArrangeItem[] = [
  { mode: 'alignTop', labelKey: 'alignTop', icon: AlignStartHorizontal, minCount: 2 },
  { mode: 'alignBottom', labelKey: 'alignBottom', icon: AlignEndHorizontal, minCount: 2 },
  { mode: 'alignLeft', labelKey: 'alignLeft', icon: AlignStartVertical, minCount: 2 },
  { mode: 'alignRight', labelKey: 'alignRight', icon: AlignEndVertical, minCount: 2 },
  { mode: 'alignMiddleV', labelKey: 'alignMiddleV', icon: AlignCenterHorizontal, minCount: 2 },
  { mode: 'alignCenterH', labelKey: 'alignCenterH', icon: AlignCenterVertical, minCount: 2 },
  { mode: 'distributeV', labelKey: 'distributeV', icon: AlignVerticalSpaceAround, minCount: 3 },
  { mode: 'distributeH', labelKey: 'distributeH', icon: AlignHorizontalSpaceAround, minCount: 3 },
  { mode: 'arrangeGrid', labelKey: 'arrangeGrid', icon: LayoutGrid, minCount: 2 },
]

type Props = {
  menu: ContextMenuState
  onCopyNodes: (nodeIds: string[]) => void
  onDeleteNodes: (nodeIds: string[]) => void
  onNodeProperties: (nodeId: string) => void
  onArrange: (mode: ArrangeMode, nodeIds: string[]) => void
  onDeleteEdge: (edgeId: string) => void
  onEdgeProperties: (edgeId: string) => void
  onClose: () => void
}

export function NodeContextMenu({
  menu,
  onCopyNodes,
  onDeleteNodes,
  onNodeProperties,
  onArrange,
  onDeleteEdge,
  onEdgeProperties,
  onClose,
}: Props) {
  const { t } = useI18n()
  const [arrangeOpen, setArrangeOpen] = useState(false)
  const [submenuLeft, setSubmenuLeft] = useState(false)
  const arrangeBtnRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setArrangeOpen(false)
    setSubmenuLeft(false)
  }, [menu])

  useLayoutEffect(() => {
    if (!arrangeOpen || !arrangeBtnRef.current || !submenuRef.current) return
    const btn = arrangeBtnRef.current.getBoundingClientRect()
    const sub = submenuRef.current.getBoundingClientRect()
    const overflowRight = btn.right + 6 + sub.width > window.innerWidth - 8
    setSubmenuLeft(overflowRight)
  }, [arrangeOpen])

  if (!menu) return null

  const selectedCount = menu.kind === 'node' ? menu.selectedIds.length : 0
  const showArrange = menu.kind === 'node'

  const runArrange = (mode: ArrangeMode) => {
    if (menu.kind !== 'node') return
    onArrange(mode, menu.selectedIds)
    onClose()
  }

  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="ctx-menu"
        style={{ top: menu.y, left: menu.x }}
        role="menu"
      >
        {menu.kind === 'node' ? (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onCopyNodes(menu.selectedIds.length ? menu.selectedIds : [menu.id])
                onClose()
              }}
            >
              <Copy size={15} />
              {t('copy')}
              {selectedCount > 1 ? ` (${selectedCount})` : ''}
            </button>
            <button
              type="button"
              role="menuitem"
              className="ctx-danger"
              onClick={() => {
                onDeleteNodes(menu.selectedIds.length ? menu.selectedIds : [menu.id])
                onClose()
              }}
            >
              <Trash2 size={15} />
              {t('delete')}
              {selectedCount > 1 ? ` (${selectedCount})` : ''}
            </button>
            <button
              type="button"
              role="menuitem"
              className="ctx-props"
              onClick={() => {
                onNodeProperties(menu.id)
                onClose()
              }}
            >
              <Settings size={15} />
              {t('properties')}
            </button>

            {showArrange ? (
              <>
                <div className="ctx-divider" role="separator" />
                <div
                  className="ctx-submenu-wrap"
                  onMouseEnter={() => setArrangeOpen(true)}
                  onMouseLeave={() => setArrangeOpen(false)}
                >
                  <button
                    ref={arrangeBtnRef}
                    type="button"
                    role="menuitem"
                    className="ctx-submenu-trigger"
                    aria-haspopup="menu"
                    aria-expanded={arrangeOpen}
                    onClick={() => setArrangeOpen((v) => !v)}
                  >
                    <LayoutGrid size={15} />
                    <span>{t('arrange')}</span>
                    <ChevronRight size={14} className="ctx-chevron" />
                  </button>
                  {arrangeOpen ? (
                    <div
                      ref={submenuRef}
                      className={`ctx-submenu ${submenuLeft ? 'open-left' : ''}`}
                      role="menu"
                    >
                      {selectedCount < 2 ? (
                        <div className="ctx-hint">{t('arrangeNeedMulti')}</div>
                      ) : null}
                      {ARRANGE_ITEMS.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            role="menuitem"
                            disabled={selectedCount < item.minCount}
                            onClick={() => runArrange(item.mode)}
                          >
                            <Icon size={15} />
                            {t(item.labelKey)}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              role="menuitem"
              className="ctx-danger"
              onClick={() => {
                onDeleteEdge(menu.id)
                onClose()
              }}
            >
              <Unplug size={15} />
              {t('deleteConnection')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="ctx-props"
              onClick={() => {
                onEdgeProperties(menu.id)
                onClose()
              }}
            >
              <Settings size={15} />
              {t('properties')}
            </button>
          </>
        )}
      </div>
    </>
  )
}
