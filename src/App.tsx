import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  ConnectionMode,
  ReactFlow,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnReconnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  OLTNode,
  SplitterRatioNode,
  SplitterBoxNode,
  PatchcordNode,
  ConnectorNode,
  BarrelNode,
  OPMNode,
  ONUNode,
  InternetNode,
  MikrotikNode,
  SmartphoneNode,
  KomputerNode,
} from './nodes'
import { Sidebar } from './components/Sidebar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { EdgePropertiesPanel } from './components/EdgePropertiesPanel'
import { NodeContextMenu, type ContextMenuState } from './components/NodeContextMenu'
import { ProjectToolbar } from './components/ProjectToolbar'
import { SettingsPanel } from './components/SettingsPanel'
import { ReportPanel } from './components/ReportPanel'
import { QuickPanel } from './components/QuickPanel'
import { ZoomControls } from './components/ZoomControls'
import { UpdateBanner } from './components/UpdateBanner'
import { useAppUpdate } from './hooks/useAppUpdate'
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary'
import { useMediaQuery } from './hooks/useMediaQuery'
import { foEdgeTypes, edgeTypeFromStyle, connectionLineTypeFromStyle, setActiveEdgePathStyle } from './edges'
import { useProjectHistory } from './hooks/useProjectHistory'
import { analyzeNetwork, createDefaultData } from './utils/calculateLoss'
import { analyzeLanNetwork } from './utils/lanNetwork'
import { exportMapAsImage, printMapAsImage, type MapImageFormat } from './utils/exportMapImage'
import {
  buildMaterialReport,
  buildOnuLossReport,
  buildQuantityReport,
  type FoReport,
} from './utils/materialReport'
import { loadSettings, saveSettings } from './settings/storage'
import type { AppSettings } from './settings/types'
import { buildOnuSsid, getNextComponentLabel, isDuplicateLabel } from './utils/naming'
import {
  downloadProject,
  isAbortError,
  openProjectWithPicker,
  parseProjectFile,
  PROJECT_FILE_EXT,
  saveProjectWithPicker,
  serializeProject,
  supportsFileSystemAccess,
  syncIdCounter,
  titleFromFilename,
  writeProjectToHandle,
} from './utils/projectFile'
import {
  clearFileHandle,
  clearSessionProject,
  ensureFilePermission,
  loadFileHandle,
  loadSessionProject,
  saveFileHandle,
  saveSessionProject,
} from './utils/sessionStore'
import { createI18nValue, I18nContext, useI18n } from './i18n/context'
import type { Locale } from './i18n/translations'
import type { ComponentType } from './data/components'
import {
  createDefaultEdgeData,
  formatEdgeLengthLabel,
  migrateLegacyQuadPortHandles,
  normalizeEdge,
  normalizeEdgeData,
} from './utils/edgeData'
import {
  isFoInputHandle,
  isFoOutputHandle,
  isLanInputHandle,
  isLanOutputHandle,
  normalizeOpmConnection,
} from './utils/connectionHelpers'
import { projectFingerprint } from './utils/projectSnapshot'
import { computeArrangePositions, type ArrangeMode } from './utils/nodeLayout'
import { buildQuickTopology, type QuickTopologyCounts } from './utils/quickTopology'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from './theme'
import type { FoNodeData, FoEdgeData, PathResult } from './types/fo'
import './App.css'

const nodeTypes = {
  olt: OLTNode,
  splitterRatio: SplitterRatioNode,
  splitterBox: SplitterBoxNode,
  patchcord: PatchcordNode,
  connector: ConnectorNode,
  barrel: BarrelNode,
  opm: OPMNode,
  onu: ONUNode,
  onuDual: ONUNode,
  internet: InternetNode,
  mikrotik: MikrotikNode,
  smartphone: SmartphoneNode,
  komputer: KomputerNode,
}

const defaultEdgeOptions = {
  reconnectable: true,
  focusable: true,
}

let idCounter = 1
const nextId = () => String(idCounter++)

function SimulatorCanvas({
  theme,
  onThemeChange,
}: {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}) {
  const { locale, t } = useI18n()
  const isMobile = useMediaQuery('(max-width: 900px)')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const { screenToFlowPosition, fitView, getViewport, setViewport } = useReactFlow()
  const [projectTitle, setProjectTitle] = useState(t('newProject'))
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FoNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FoEdgeData>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [showQuickPanel, setShowQuickPanel] = useState(false)
  const [report, setReport] = useState<FoReport | null>(null)
  const appUpdate = useAppUpdate()
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadSettings())
  const [panelMode, setPanelMode] = useState<'node' | 'edge'>('node')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [results, setResults] = useState<PathResult[]>([])
  const [selectedOnuId, setSelectedOnuId] = useState<string | null>(null)
  const [highlightPath, setHighlightPath] = useState<string[]>([])
  const [linkedFileName, setLinkedFileName] = useState<string | null>(null)
  const [savedFingerprint, setSavedFingerprint] = useState('')
  /** Edge yang sedang di-reconnect (agar isValidConnection tidak mengunci handle-nya sendiri) */
  const reconnectingEdgeIdRef = useRef<string | null>(null)
  const clipboardRef = useRef<{
    nodes: Node<FoNodeData>[]
    edges: Edge<FoEdgeData>[]
  } | null>(null)
  const multiSelectSnapshotRef = useRef<string[]>([])
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const markSaved = useCallback(
    (title: string, nextNodes: Node<FoNodeData>[], nextEdges: Edge<FoEdgeData>[]) => {
      setSavedFingerprint(projectFingerprint(title, nextNodes, nextEdges))
    },
    [],
  )

  const isDirty = useMemo(
    () => savedFingerprint !== projectFingerprint(projectTitle, nodes, edges),
    [savedFingerprint, projectTitle, nodes, edges],
  )

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const isOpmNodeId = useCallback(
    (nodeId: string) => nodes.some((n) => n.id === nodeId && n.data.type === 'opm'),
    [nodes],
  )

  const isOpmEdge = useCallback(
    (edge: Edge) => isOpmNodeId(edge.source) || isOpmNodeId(edge.target),
    [isOpmNodeId],
  )

  const selectedEdge = useMemo(() => {
    if (selectedEdgeId) {
      return edges.find((e) => e.id === selectedEdgeId) ?? null
    }
    return edges.find((e) => e.selected) ?? null
  }, [edges, selectedEdgeId])

  const resetUiState = useCallback(() => {
    setSelectedId(null)
    setSelectedEdgeId(null)
    setShowPropertiesPanel(false)
    setPanelMode('node')
    setContextMenu(null)
    setSelectedOnuId(null)
    setHighlightPath([])
  }, [])

  const { pushUndo, undo, redo, clearHistory, canUndo, canRedo } = useProjectHistory({
    projectTitle,
    nodes,
    edges,
    setProjectTitle,
    setNodes,
    setEdges,
    onApply: resetUiState,
  })

  const loadProject = useCallback(
    (title: string, nextNodes: Node<FoNodeData>[], nextEdges: Edge<FoEdgeData>[]) => {
      const nodesWithoutCable = nextNodes.filter(
        (n) => (n.data as { type?: string }).type !== 'cable',
      )
      const normalizedEdges = migrateLegacyQuadPortHandles(
        nextEdges.map(normalizeEdge),
        nodesWithoutCable,
      )
      idCounter = syncIdCounter(nodesWithoutCable, normalizedEdges)
      setProjectTitle(title)
      setNodes(nodesWithoutCable.map((n) => ({ ...n, selected: false })))
      setEdges(normalizedEdges.map((e) => ({ ...e, selected: false })))
      resetUiState()
      markSaved(title, nodesWithoutCable, normalizedEdges)
      clearHistory()
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    },
    [setNodes, setEdges, resetUiState, fitView, markSaved, clearHistory],
  )

  const setActiveFileHandle = useCallback(async (handle: FileSystemFileHandle | null) => {
    fileHandleRef.current = handle
    if (handle) {
      await saveFileHandle(handle)
      setLinkedFileName(handle.name)
      setProjectTitle(titleFromFilename(handle.name))
    } else {
      await clearFileHandle()
      setLinkedFileName(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const session = loadSessionProject()
      const handle = await loadFileHandle()
      let fileTitle: string | null = null

      if (handle) {
        const allowed = await ensureFilePermission(handle, 'readwrite')
        if (!cancelled && allowed) {
          fileHandleRef.current = handle
          fileTitle = titleFromFilename(handle.name)
          setLinkedFileName(handle.name)
        } else if (!cancelled) {
          fileHandleRef.current = null
          await clearFileHandle()
        }
      }

      if (!cancelled && session) {
        loadProject(fileTitle ?? session.title, session.nodes, session.edges)
      } else if (!cancelled && fileTitle) {
        setProjectTitle(fileTitle)
      }

      if (!cancelled) setSessionReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [loadProject])

  useEffect(() => {
    if (!sessionReady) return
    const timer = window.setTimeout(() => {
      saveSessionProject(serializeProject(projectTitle, nodes, edges))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [sessionReady, projectTitle, nodes, edges])

  const newProject = useCallback(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const ok = window.confirm(t('confirmNew'))
      if (!ok) return
    }
    idCounter = 1
    void setActiveFileHandle(null)
    clearSessionProject()
    loadProject(t('newProject'), [], [])
  }, [nodes.length, edges.length, loadProject, setActiveFileHandle, t])

  const generateQuickTopology = useCallback(
    (counts: QuickTopologyCounts) => {
      if (nodes.length > 0 || edges.length > 0) {
        const ok = window.confirm(t('quickConfirmReplace'))
        if (!ok) return
      }

      pushUndo()
      const { nodes: nextNodes, edges: nextEdges, warnings } = buildQuickTopology({
        counts,
        settings: appSettings,
        locale,
      })
      idCounter = syncIdCounter(nextNodes, nextEdges)
      setNodes(nextNodes.map((n) => ({ ...n, selected: false })))
      setEdges(nextEdges.map((e) => ({ ...e, selected: false })))
      setSelectedId(null)
      setSelectedEdgeId(null)
      setShowPropertiesPanel(false)
      setShowQuickPanel(false)
      setContextMenu(null)
      setHighlightPath([])
      setSelectedOnuId(null)
      setTimeout(() => fitView({ padding: 0.2 }), 80)

      if (warnings.length > 0) {
        window.alert(`${t('quickWarnPrefix')}:\n- ${warnings.join('\n- ')}`)
      }
    },
    [
      nodes.length,
      edges.length,
      t,
      pushUndo,
      appSettings,
      locale,
      setNodes,
      setEdges,
      fitView,
    ],
  )

  const saveProjectAs = useCallback(async () => {
    try {
      if (supportsFileSystemAccess()) {
        const draft = serializeProject(projectTitle, nodes, edges)
        const handle = await saveProjectWithPicker(draft)
        if (!handle) return
        const title = titleFromFilename(handle.name)
        const project = serializeProject(title, nodes, edges)
        await writeProjectToHandle(handle, project)
        await setActiveFileHandle(handle)
        setProjectTitle(title)
        saveSessionProject(project)
        markSaved(title, nodes, edges)
        return
      }
      const project = serializeProject(projectTitle, nodes, edges)
      downloadProject(project)
      saveSessionProject(project)
      markSaved(projectTitle, nodes, edges)
    } catch (err) {
      if (isAbortError(err)) return
      const message = err instanceof Error ? err.message : t('saveFailed')
      window.alert(message)
    }
  }, [projectTitle, nodes, edges, setActiveFileHandle, t, markSaved])

  const saveProject = useCallback(async () => {
    try {
      if (fileHandleRef.current) {
        const allowed = await ensureFilePermission(fileHandleRef.current, 'readwrite')
        if (!allowed) {
          await saveProjectAs()
          return
        }

        const project = serializeProject(projectTitle, nodes, edges)
        await writeProjectToHandle(fileHandleRef.current, project)
        saveSessionProject(project)
        markSaved(projectTitle, nodes, edges)
        return
      }
      await saveProjectAs()
    } catch (err) {
      if (isAbortError(err)) return
      const message = err instanceof Error ? err.message : t('saveFailed')
      window.alert(message)
    }
  }, [nodes, edges, projectTitle, saveProjectAs, t, markSaved])

  const exportMap = useCallback(
    async (format: MapImageFormat) => {
      try {
        await exportMapAsImage({
          nodes,
          projectTitle,
          format,
          locale,
        })
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : t('exportFailed')
        window.alert(message)
      }
    },
    [nodes, projectTitle, t, locale],
  )

  const printTopology = useCallback(async () => {
    try {
      await printMapAsImage({
        nodes,
        projectTitle,
        locale,
      })
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t('printTopologyFail')
      window.alert(message)
    }
  }, [nodes, projectTitle, t, locale])

  const openProjectFile = useCallback(async () => {
    if (supportsFileSystemAccess()) {
      try {
        const result = await openProjectWithPicker()
        if (!result) return
        const title = titleFromFilename(result.handle.name)
        await setActiveFileHandle(result.handle)
        loadProject(title, result.project.nodes, result.project.edges)
        saveSessionProject(serializeProject(title, result.project.nodes, result.project.edges))
        return
      } catch (err) {
        if (isAbortError(err)) return
        const message = err instanceof Error ? err.message : t('openFailed')
        window.alert(message)
        return
      }
    }
    fileInputRef.current?.click()
  }, [loadProject, setActiveFileHandle, t])

  const onProjectFileSelected = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = parseProjectFile(JSON.parse(String(reader.result)))
          const title = titleFromFilename(file.name)
          void setActiveFileHandle(null)
          loadProject(title, parsed.nodes, parsed.edges)
          saveSessionProject(serializeProject(title, parsed.nodes, parsed.edges))
        } catch (err) {
          const message = err instanceof Error ? err.message : t('openFailed')
          window.alert(message)
        }
      }
      reader.readAsText(file)
    },
    [loadProject, setActiveFileHandle, t],
  )

  const updateAppSettings = useCallback((next: AppSettings) => {
    setAppSettings(next)
    saveSettings(next)
  }, [])

  useEffect(() => {
    setActiveEdgePathStyle(appSettings.edgePathStyle)
  }, [appSettings.edgePathStyle])

  useEffect(() => {
    const { results: nextResults, updatedNodes } = analyzeNetwork(nodes, edges, appSettings)
    setResults(nextResults)

    const lan = analyzeLanNetwork(updatedNodes, edges)

    setNodes((current) => {
      let changed = false
      const next = current.map((cur) => {
        const u = lan.updatedNodes.find((n) => n.id === cur.id) ?? updatedNodes.find((n) => n.id === cur.id)
        if (!u) return cur

        if ((u.data.type === 'onu' || u.data.type === 'onuDual') && (cur.data.type === 'onu' || cur.data.type === 'onuDual')) {
          if (
            cur.data.receivedPower === u.data.receivedPower &&
            cur.data.totalLoss === u.data.totalLoss &&
            cur.data.status === u.data.status
          ) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data, type: cur.data.type } }
        }

        if (u.data.type === 'opm' && cur.data.type === 'opm') {
          if (
            cur.data.measuredPower === u.data.measuredPower &&
            cur.data.totalLoss === u.data.totalLoss &&
            cur.data.status === u.data.status
          ) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data } }
        }

        if (u.data.type === 'splitterRatio' && cur.data.type === 'splitterRatio') {
          if (
            cur.data.powerLarge === u.data.powerLarge &&
            cur.data.powerSmall === u.data.powerSmall
          ) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data } }
        }

        if (u.data.type === 'splitterBox' && cur.data.type === 'splitterBox') {
          if (cur.data.powerOut === u.data.powerOut) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data } }
        }

        if (u.data.type === 'mikrotik' && cur.data.type === 'mikrotik') {
          if (
            cur.data.wanIp === u.data.wanIp &&
            cur.data.wanConnected === u.data.wanConnected
          ) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data } }
        }

        if (u.data.type === 'smartphone' && cur.data.type === 'smartphone') {
          if (
            cur.data.online === u.data.online &&
            cur.data.wifiConnected === u.data.wifiConnected &&
            cur.data.ipAddress === u.data.ipAddress &&
            cur.data.gateway === u.data.gateway &&
            cur.data.subnetMask === u.data.subnetMask &&
            cur.data.wirelessOnuId === u.data.wirelessOnuId &&
            cur.data.speedMbps === u.data.speedMbps
          ) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data } }
        }

        if (u.data.type === 'komputer' && cur.data.type === 'komputer') {
          if (
            cur.data.connected === u.data.connected &&
            cur.data.ipAddress === u.data.ipAddress &&
            cur.data.gateway === u.data.gateway &&
            cur.data.subnetMask === u.data.subnetMask &&
            cur.data.speedMbps === u.data.speedMbps
          ) {
            return cur
          }
          changed = true
          return { ...cur, data: { ...cur.data, ...u.data } }
        }

        return cur
      })
      return changed ? next : current
    })

    setEdges((eds) => {
      const withoutWireless = eds.filter(
        (e) => e.data?.linkKind !== 'wireless' && e.type !== 'foWireless',
      )
      const nextIds = lan.wirelessEdges
        .map((e) => e.id)
        .sort()
        .join('|')
      const curWirelessIds = eds
        .filter((e) => e.data?.linkKind === 'wireless' || e.type === 'foWireless')
        .map((e) => e.id)
        .sort()
        .join('|')
      if (nextIds === curWirelessIds && withoutWireless.length === eds.length - (curWirelessIds ? curWirelessIds.split('|').filter(Boolean).length : 0)) {
        if (nextIds === curWirelessIds) return eds
      }
      if (nextIds === curWirelessIds && lan.wirelessEdges.length === 0 && withoutWireless.length === eds.length) {
        return eds
      }
      if (nextIds === curWirelessIds && withoutWireless.length + lan.wirelessEdges.length === eds.length) {
        return eds
      }
      // Wireless di depan array agar digambar di bawah tali FO/LAN & di bawah node
      return [...lan.wirelessEdges, ...withoutWireless]
    })

    setSelectedOnuId((prev) => {
      if (prev && nextResults.some((r) => r.onuId === prev)) return prev
      return nextResults[0]?.onuId ?? null
    })
  }, [
    edges,
    edges
      .map((e) => `${e.id}:${e.source}:${e.target}:${e.sourceHandle}:${e.targetHandle}:${JSON.stringify(e.data ?? {})}`)
      .join('|'),
    nodes
      .map((n) => {
        if (n.data.type === 'onu' || n.data.type === 'onuDual') {
          return `${n.id}:onu:${n.data.receivedPower}:${n.data.totalLoss}:${n.data.status}:${n.data.ssid}:${n.data.wifiPassword}`
        }
        if (n.data.type === 'opm') {
          return `${n.id}:opm:${n.data.measuredPower}:${n.data.totalLoss}:${n.data.status}`
        }
        if (n.data.type === 'splitterRatio') {
          const { powerLarge: _pl, powerSmall: _ps, ...stable } = n.data
          return `${n.id}:sr:${JSON.stringify(stable)}`
        }
        if (n.data.type === 'splitterBox') {
          const { powerOut: _po, ...stable } = n.data
          return `${n.id}:sb:${JSON.stringify(stable)}`
        }
        if (n.data.type === 'mikrotik') {
          const { wanIp: _w, wanConnected: _c, wanGateway: _g, wanSubnetMask: _m, ...stable } = n.data
          return `${n.id}:mt:${JSON.stringify(stable)}`
        }
        if (n.data.type === 'smartphone') {
          const {
            online: _o,
            wifiConnected: _wf,
            speedMbps: _s,
            wirelessOnuId: _w,
            connectedSsid: _cs,
            connectedPassword: _cp,
            gateway: _g,
            subnetMask: _sm,
            ipAddress: _ip,
            ...stable
          } = n.data
          return `${n.id}:hp:${JSON.stringify(stable)}`
        }
        if (n.data.type === 'komputer') {
          const {
            connected: _c,
            speedMbps: _s,
            gateway: _g,
            subnetMask: _sm,
            ipAddress: _ip,
            ...stable
          } = n.data
          return `${n.id}:pc:${JSON.stringify(stable)}`
        }
        return `${n.id}:${JSON.stringify(n.data)}`
      })
      .join('|'),
    appSettings,
    setNodes,
    setEdges,
  ])

  useEffect(() => {
    const path = results.find((r) => r.onuId === selectedOnuId)?.pathNodeIds ?? []
    setHighlightPath(path)
  }, [results, selectedOnuId])

  const styledEdges = useMemo(() => {
    // Pasangan node berurutan pada jalur aktif terbaik OLT → ONU (dua arah)
    const livePairs = new Set<string>()
    for (const r of results) {
      const path = r.pathNodeIds
      for (let i = 0; i < path.length - 1; i++) {
        livePairs.add(`${path[i]}>${path[i + 1]}`)
        livePairs.add(`${path[i + 1]}>${path[i]}`)
      }
    }

    const highlightPairs = new Set<string>()
    for (let i = 0; i < highlightPath.length - 1; i++) {
      highlightPairs.add(`${highlightPath[i]}>${highlightPath[i + 1]}`)
    }

    const opmIds = new Set(nodes.filter((n) => n.data.type === 'opm').map((n) => n.id))
    const nodeById = new Map(nodes.map((n) => [n.id, n]))

    // Tali LAN beranimasi jika klien sudah dapat DHCP Mikrotik
    const dhcpClientIds = new Set<string>()
    for (const n of nodes) {
      if (n.data.type === 'komputer' && n.data.connected) dhcpClientIds.add(n.id)
      if (n.data.type === 'smartphone' && n.data.online) dhcpClientIds.add(n.id)
    }
    const onuWithDhcpClient = new Set<string>()
    for (const e of edges) {
      if (e.data?.linkKind !== 'lan') continue
      const a = nodeById.get(e.source)
      const b = nodeById.get(e.target)
      if (!a || !b) continue
      const mark = (onu: typeof a, peer: typeof b) => {
        if (
          (onu.data.type === 'onu' || onu.data.type === 'onuDual') &&
          peer.data.type === 'komputer' &&
          peer.data.connected
        ) {
          onuWithDhcpClient.add(onu.id)
        }
      }
      mark(a, b)
      mark(b, a)
    }

    const isLanDhcpLive = (e: (typeof edges)[number], data: ReturnType<typeof normalizeEdgeData>) => {
      if (data.linkKind !== 'lan') return false
      if (dhcpClientIds.has(e.source) || dhcpClientIds.has(e.target)) return true
      const a = nodeById.get(e.source)?.data
      const b = nodeById.get(e.target)?.data
      if (!a || !b) return false
      // Internet → Mikrotik (WAN DHCP)
      if (
        (a.type === 'internet' && b.type === 'mikrotik' && b.wanConnected) ||
        (b.type === 'internet' && a.type === 'mikrotik' && a.wanConnected)
      ) {
        return true
      }
      // Mikrotik ↔ OLT: animasi jika DHCP Server Mikrotik ON
      if (
        (a.type === 'mikrotik' && a.dhcpServer?.enabled && b.type === 'olt') ||
        (b.type === 'mikrotik' && b.dhcpServer?.enabled && a.type === 'olt')
      ) {
        return true
      }
      // Mikrotik ↔ ONU yang sudah memberi DHCP ke klien
      if (
        (a.type === 'mikrotik' && onuWithDhcpClient.has(e.target)) ||
        (b.type === 'mikrotik' && onuWithDhcpClient.has(e.source))
      ) {
        return true
      }
      return false
    }

    return edges.map((e) => {
      const edgeData = normalizeEdgeData(e.data)
      const isWireless =
        edgeData.linkKind === 'wireless' || e.type === 'foWireless'
      if (isWireless) {
        return {
          ...e,
          type: 'foWireless' as const,
          data: { ...edgeData, linkKind: 'wireless' as const },
          // Animasi RF dimatikan; pulse CSS hanya saat sudah dapat IP (di FoWirelessEdge)
          animated: false,
          zIndex: 0,
          className: 'fo-wireless-edge',
          reconnectable: false,
          label: undefined,
          style: { stroke: 'transparent', strokeWidth: 0 },
        }
      }

      const pair = `${e.source}>${e.target}`
      const isLive = livePairs.has(pair)
      const onPath = highlightPairs.has(pair)
      const isOpmLink = opmIds.has(e.source) || opmIds.has(e.target)
      const lanDhcp = isLanDhcpLive(e, edgeData)
      const isSelected = e.selected === true
      const lengthLabel = formatEdgeLengthLabel(edgeData)
      const customColor = edgeData.color || null
      const emphasize = isLive || onPath || isSelected || isOpmLink || lanDhcp
      const edgeClass = [
        isOpmLink ? 'fo-edge-opm' : '',
        isLive ? 'fo-edge-live' : '',
        lanDhcp ? 'fo-edge-lan-dhcp' : '',
        edgeData.hasPatchcord ? 'fo-edge-has-pc' : '',
        edgeData.hasSleeve ? 'fo-edge-has-sl' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined
      const autoStroke = isOpmLink
        ? '#dc2626'
        : lanDhcp
          ? '#0284c7'
          : isLive
            ? '#0f766e'
            : '#a8a29e'
      const stroke = isSelected ? '#0369a1' : customColor ?? autoStroke
      const edgeType = edgeTypeFromStyle(appSettings.edgePathStyle)
      return {
        ...e,
        type: edgeType,
        data: edgeData,
        // Jalur FO live / OPM / LAN+DHCP → animasi
        animated: (isLive && !isOpmLink) || isOpmLink || lanDhcp,
        className: edgeClass,
        reconnectable: true,
        label: lengthLabel,
        labelShowBg: Boolean(lengthLabel),
        labelStyle: {
          fill:
            isSelected
              ? '#0369a1'
              : customColor ??
                (isOpmLink ? '#dc2626' : lanDhcp ? '#0369a1' : isLive ? '#0f766e' : '#44403c'),
          fontSize: 11,
          fontWeight: 650,
        },
        labelBgStyle: {
          fill: '#fffdf8',
          fillOpacity: 0.95,
        },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
        pathOptions:
          edgeType === 'smoothstep' || edgeType === 'step'
            ? { offset: 20, borderRadius: 12 }
            : undefined,
        style: {
          stroke,
          strokeWidth: emphasize || customColor ? 2.5 : 1.5,
        },
      }
    })
  }, [edges, nodes, results, highlightPath, appSettings.edgePathStyle])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      pushUndo()

      const involvesOpm =
        isOpmNodeId(connection.source) || isOpmNodeId(connection.target)

      const normalized = involvesOpm
        ? normalizeOpmConnection(connection, isOpmNodeId)
        : {
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle ?? null,
            targetHandle: connection.targetHandle ?? null,
          }

      const { source, target, sourceHandle, targetHandle } = normalized
      if (source === target) return

      const sourceIsOpm = isOpmNodeId(source)
      const targetIsOpm = isOpmNodeId(target)

      setEdges((eds) => {
        const markSelected = (next: Edge<FoEdgeData>[], edgeId: string) => {
          queueMicrotask(() => setSelectedEdgeId(edgeId))
          return next.map((e) => ({ ...e, selected: e.id === edgeId }))
        }

        // Tali OPM: boleh paralel ke jalur FO; hanya pindah tali OPM milik node itu sendiri
        if (sourceIsOpm || targetIsOpm) {
          const opmId = sourceIsOpm ? source : target
          const ownOpmEdge = eds.find(
            (e) => e.source === opmId || e.target === opmId,
          )
          if (ownOpmEdge) {
            return markSelected(
              eds.map((e) =>
                e.id === ownOpmEdge.id
                  ? {
                      ...e,
                      source,
                      target,
                      sourceHandle,
                      targetHandle,
                      data: normalizeEdgeData(e.data),
                      reconnectable: true,
                    }
                  : e,
              ),
              ownOpmEdge.id,
            )
          }
          const id = `e-${nextId()}`
          return markSelected(
            addEdge(
              {
                id,
                source,
                target,
                sourceHandle,
                targetHandle,
                data: createDefaultEdgeData(),
                reconnectable: true,
              },
              eds,
            ),
            id,
          )
        }

        // Jalur FO / LAN: tali baru (pindah hanya lewat drag ujung / onReconnect)
        const id = `e-${nextId()}`
        const isLan =
          isLanOutputHandle(sourceHandle) && isLanInputHandle(targetHandle)
        return markSelected(
          addEdge(
            {
              id,
              source,
              target,
              sourceHandle,
              targetHandle,
              data: {
                ...createDefaultEdgeData(),
                linkKind: isLan ? 'lan' : 'fo',
              },
              reconnectable: true,
            },
            eds,
          ),
          id,
        )
      })
    },
    [setEdges, isOpmNodeId, pushUndo],
  )

  /** Pindah ujung tali ke port lain — hanya via drag dekat titik connector */
  const onReconnect: OnReconnect<Edge<FoEdgeData>> = useCallback(
    (oldEdge, newConnection) => {
      if (!newConnection.source || !newConnection.target) return
      if (newConnection.source === newConnection.target) return

      pushUndo()

      const involvesOpm =
        isOpmNodeId(newConnection.source) || isOpmNodeId(newConnection.target)
      const normalized = involvesOpm
        ? normalizeOpmConnection(newConnection, isOpmNodeId)
        : {
            source: newConnection.source,
            target: newConnection.target,
            sourceHandle: newConnection.sourceHandle ?? null,
            targetHandle: newConnection.targetHandle ?? null,
          }

      if (normalized.source === normalized.target) return

      setEdges((eds) => {
        if (!eds.some((e) => e.id === oldEdge.id)) return eds
        return eds.map((e) => {
          if (e.id !== oldEdge.id) return e
          return {
            ...e,
            source: normalized.source,
            target: normalized.target,
            sourceHandle: normalized.sourceHandle,
            targetHandle: normalized.targetHandle,
            data: normalizeEdgeData(e.data ?? oldEdge.data),
            reconnectable: true,
          }
        })
      })
      queueMicrotask(() => setSelectedEdgeId(oldEdge.id))
    },
    [setEdges, isOpmNodeId, pushUndo],
  )

  const onReconnectStart = useCallback((_: unknown, edge: Edge) => {
    reconnectingEdgeIdRef.current = edge.id
  }, [])

  const onReconnectEnd = useCallback(() => {
    reconnectingEdgeIdRef.current = null
  }, [])

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source
      const target = connection.target
      if (!source || !target || source === target) return false
      const sourceNode = nodes.find((n) => n.id === source)
      const targetNode = nodes.find((n) => n.id === target)
      if (!sourceNode || !targetNode) return false

      const sourceIsOpm = sourceNode.data.type === 'opm'
      const targetIsOpm = targetNode.data.type === 'opm'
      if (sourceIsOpm && targetIsOpm) return false

      // OPM: bebas ke input/output mana pun (Loose + normalisasi arah di onConnect)
      if (sourceIsOpm || targetIsOpm) return true

      const sourceHandle = connection.sourceHandle ?? null
      const targetHandle = connection.targetHandle ?? null

      // Jalur LAN / WAN
      const lanLink =
        isLanOutputHandle(sourceHandle) && isLanInputHandle(targetHandle)
      // Wireless handle hanya untuk animasi auto — tidak digambar manual
      if (sourceHandle === 'wlan' || targetHandle === 'wlan-in') return false

      if (lanLink) {
        const skipId = reconnectingEdgeIdRef.current
        const handleBusy = (nodeId: string, handleId: string | null) =>
          edges.some(
            (e) =>
              e.id !== skipId &&
              e.data?.linkKind !== 'wireless' &&
              ((e.source === nodeId && (e.sourceHandle ?? null) === handleId) ||
                (e.target === nodeId && (e.targetHandle ?? null) === handleId)),
          )
        if (handleBusy(source, sourceHandle) || handleBusy(target, targetHandle)) return false
        return true
      }

      // Jalur FO: output → input (port Patchcord/Sleeve/Barel dua arah = keduanya)
      if (!isFoOutputHandle(sourceHandle) || !isFoInputHandle(targetHandle)) {
        return false
      }

      const skipId = reconnectingEdgeIdRef.current

      // Satu jalur FO per port (port dua arah sibuk jika dipakai sebagai source ATAU target)
      const handleBusy = (nodeId: string, handleId: string | null) =>
        edges.some(
          (e) =>
            e.id !== skipId &&
            !isOpmEdge(e) &&
            ((e.source === nodeId && (e.sourceHandle ?? null) === handleId) ||
              (e.target === nodeId && (e.targetHandle ?? null) === handleId)),
        )
      if (handleBusy(source, sourceHandle) || handleBusy(target, targetHandle)) return false
      return true
    },
    [nodes, edges, isOpmEdge],
  )

  const updateEdgeData = useCallback(
    (id: string, data: FoEdgeData) => {
      pushUndo()
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, data } : e)),
      )
    },
    [setEdges, pushUndo],
  )

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/fo-type') as ComponentType
      if (!type) return

      pushUndo()
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      setNodes((nds) => {
        const label = getNextComponentLabel(
          type,
          nds.map((n) => n.data.label),
        )
        const id = `${type}-${nextId()}`
        const newNode: Node<FoNodeData> = {
          id,
          type,
          position,
          data: createDefaultData(type, label, appSettings),
        }
        setSelectedId(id)
        setSelectedEdgeId(null)
        setPanelMode('node')
        setShowSettingsPanel(false)
        return nds.concat(newNode)
      })
    },
    [screenToFlowPosition, setNodes, pushUndo, appSettings],
  )

  /** Mobile: tap palette item → place near viewport center */
  const addComponentAtCenter = useCallback(
    (type: ComponentType) => {
      pushUndo()
      const wrap = wrapperRef.current?.getBoundingClientRect()
      const clientX = wrap ? wrap.left + wrap.width / 2 : window.innerWidth / 2
      const clientY = wrap ? wrap.top + wrap.height / 2 : window.innerHeight / 2
      const position = screenToFlowPosition({ x: clientX, y: clientY })

      setNodes((nds) => {
        const label = getNextComponentLabel(
          type,
          nds.map((n) => n.data.label),
        )
        const id = `${type}-${nextId()}`
        const newNode: Node<FoNodeData> = {
          id,
          type,
          position,
          data: createDefaultData(type, label, appSettings),
        }
        setSelectedId(id)
        setSelectedEdgeId(null)
        setPanelMode('node')
        setShowSettingsPanel(false)
        return nds.concat(newNode)
      })
      if (isMobile) setSidebarOpen(false)
    },
    [screenToFlowPosition, setNodes, pushUndo, appSettings, isMobile],
  )

  const updateNodeData = useCallback(
    (id: string, data: FoNodeData) => {
      pushUndo()
      setNodes((nds) => {
        const current = nds.find((n) => n.id === id)
        if (!current) return nds

        if (
          data.label.trim() !== current.data.label &&
          isDuplicateLabel(
            nds.map((n) => n.data.label),
            data.label,
            current.data.label,
          )
        ) {
          return nds
        }

        return nds.map((n) => (n.id === id ? { ...n, data } : n))
      })
    },
    [setNodes, pushUndo],
  )

  const selectNode = useCallback(
    (nodeId: string, openProperties = false, nodeType?: FoNodeData['type']) => {
      setSelectedId(nodeId)
      setSelectedEdgeId(null)
      setPanelMode('node')
      if (nodeType === 'onu') {
        setSelectedOnuId(nodeId)
      }
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        })),
      )
      setEdges((eds) => {
        if (!eds.some((e) => e.selected)) return eds
        return eds.map((e) => (e.selected ? { ...e, selected: false } : e))
      })
      if (openProperties) {
        setShowSettingsPanel(false)
        setShowPropertiesPanel(true)
      }
    },
    [setNodes, setEdges],
  )

  const selectEdge = useCallback((edgeId: string, openProperties = false) => {
    setSelectedEdgeId(edgeId)
    setSelectedId(null)
    setPanelMode('edge')
    setNodes((nds) => {
      if (nds.every((n) => !n.selected)) return nds
      return nds.map((n) => ({ ...n, selected: false }))
    })
    setEdges((eds) => {
      const target = eds.find((e) => e.id === edgeId)
      const onlyTargetSelected =
        target?.selected && eds.filter((e) => e.selected).length === 1
      if (onlyTargetSelected) return eds
      return eds.map((e) => ({ ...e, selected: e.id === edgeId }))
    })
    if (openProperties) {
      setShowSettingsPanel(false)
      setShowPropertiesPanel(true)
    }
  }, [setNodes, setEdges])

  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setSelectedEdgeId(null)
    setContextMenu(null)
    setShowPropertiesPanel(false)
    setPanelMode('node')
    setNodes((nds) => {
      if (nds.every((n) => !n.selected)) return nds
      return nds.map((n) => ({ ...n, selected: false }))
    })
    setEdges((eds) => {
      if (!eds.some((e) => e.selected)) return eds
      return eds.map((e) => (e.selected ? { ...e, selected: false } : e))
    })
  }, [setNodes, setEdges])

  const cloneSelection = useCallback(
    (sources: Node<FoNodeData>[], sourceEdges: Edge<FoEdgeData>[], offset = 48) => {
      if (sources.length === 0) return

      pushUndo()
      const idMap = new Map<string, string>()
      const usedLabels = nodes.map((n) => n.data.label)
      const copies: Node<FoNodeData>[] = sources.map((source) => {
        const type = (source.type ?? source.data.type) as ComponentType
        const label = getNextComponentLabel(type, usedLabels)
        usedLabels.push(label)
        const id = `${type}-${nextId()}`
        idMap.set(source.id, id)
        const data = structuredClone(source.data)
        if (data.type === 'onu' || data.type === 'onuDual') {
          data.receivedPower = null
          data.totalLoss = null
          data.status = 'disconnected'
          data.ssid = buildOnuSsid(data.type, label)
          data.wifiPassword = data.wifiPassword || '1234'
        }
        data.label = label
        return {
          ...source,
          id,
          type,
          position: {
            x: source.position.x + offset,
            y: source.position.y + offset,
          },
          data,
          selected: true,
        }
      })

      const edgeCopies: Edge<FoEdgeData>[] = sourceEdges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({
          ...e,
          id: `e-${nextId()}`,
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          selected: false,
          data: structuredClone(normalizeEdgeData(e.data)),
        }))

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...copies])
      setEdges((eds) => [...eds.map((e) => ({ ...e, selected: false })), ...edgeCopies])
      setSelectedId(copies[copies.length - 1]?.id ?? null)
      setSelectedEdgeId(null)
      setPanelMode('node')
      setShowPropertiesPanel(false)
    },
    [nodes, pushUndo, setNodes, setEdges],
  )

  const copySelectionToClipboard = useCallback(() => {
    let selectedNodes = nodes.filter((n) => n.selected)
    if (selectedNodes.length === 0 && multiSelectSnapshotRef.current.length > 0) {
      const idSet = new Set(multiSelectSnapshotRef.current)
      selectedNodes = nodes.filter((n) => idSet.has(n.id))
    }
    if (selectedNodes.length === 0) return false
    const selectedIds = new Set(selectedNodes.map((n) => n.id))
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    )
    clipboardRef.current = {
      nodes: selectedNodes.map((n) => structuredClone(n)),
      edges: selectedEdges.map((e) => structuredClone(e)),
    }
    return true
  }, [nodes, edges])

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current
    if (!clip || clip.nodes.length === 0) return
    cloneSelection(clip.nodes, clip.edges, 48)
  }, [cloneSelection])

  const duplicateSelection = useCallback(() => {
    let selectedNodes = nodes.filter((n) => n.selected)
    if (selectedNodes.length === 0 && multiSelectSnapshotRef.current.length > 0) {
      const idSet = new Set(multiSelectSnapshotRef.current)
      selectedNodes = nodes.filter((n) => idSet.has(n.id))
    }
    if (selectedNodes.length === 0) return
    const selectedIds = new Set(selectedNodes.map((n) => n.id))
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    )
    cloneSelection(selectedNodes, selectedEdges, 48)
  }, [nodes, edges, cloneSelection])

  const duplicateNodesByIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      const selectedNodes = nodes.filter((n) => idSet.has(n.id))
      if (selectedNodes.length === 0) return
      const selectedEdges = edges.filter(
        (e) => idSet.has(e.source) && idSet.has(e.target),
      )
      cloneSelection(selectedNodes, selectedEdges, 48)
    },
    [nodes, edges, cloneSelection],
  )

  useEffect(() => {
    const ids = nodes.filter((n) => n.selected).map((n) => n.id)
    if (ids.length >= 2) multiSelectSnapshotRef.current = ids
  }, [nodes])

  const arrangeSelection = useCallback(
    (mode: ArrangeMode, nodeIds?: string[]) => {
      const idSet = new Set(nodeIds?.length ? nodeIds : nodes.filter((n) => n.selected).map((n) => n.id))
      const selectedNodes = nodes.filter((n) => idSet.has(n.id))
      if (selectedNodes.length < 2) return
      if ((mode === 'distributeH' || mode === 'distributeV') && selectedNodes.length < 3) {
        return
      }
      const positions = computeArrangePositions(selectedNodes, mode)
      if (positions.size === 0) return
      pushUndo()
      setNodes((nds) =>
        nds.map((n) => {
          const next = positions.get(n.id)
          if (!next) return n
          return { ...n, position: { x: next.x, y: next.y } }
        }),
      )
    },
    [nodes, pushUndo, setNodes],
  )

  const deleteNodes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      pushUndo()
      setNodes((nds) => nds.filter((n) => !idSet.has(n.id)))
      setEdges((eds) => eds.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)))
      if (selectedId && idSet.has(selectedId)) {
        setSelectedId(null)
        setShowPropertiesPanel(false)
      }
      multiSelectSnapshotRef.current = []
      setContextMenu(null)
    },
    [setNodes, setEdges, selectedId, pushUndo],
  )

  const deleteNode = useCallback(
    (id: string) => {
      deleteNodes([id])
    },
    [deleteNodes],
  )

  const deleteEdge = useCallback(
    (id: string) => {
      pushUndo()
      setEdges((eds) => eds.filter((e) => e.id !== id))
      if (selectedEdgeId === id) {
        setSelectedEdgeId(null)
        setShowPropertiesPanel(false)
      }
      setContextMenu(null)
    },
    [setEdges, selectedEdgeId, pushUndo],
  )

  const getSelectedNodes = useCallback(() => {
    const live = nodes.filter((n) => n.selected)
    if (live.length > 0) return live
    const snap = multiSelectSnapshotRef.current
    if (snap.length === 0) return []
    const idSet = new Set(snap)
    return nodes.filter((n) => idSet.has(n.id))
  }, [nodes])

  const deleteSelectedNodes = useCallback(() => {
    const selected = getSelectedNodes()
    if (selected.length === 0) return false
    deleteNodes(selected.map((n) => n.id))
    return true
  }, [getSelectedNodes, deleteNodes])

  const onNodeDragStart: OnNodeDrag<Node<FoNodeData>> = useCallback(() => {
    pushUndo()
  }, [pushUndo])

  const onBeforeDelete = useCallback(() => {
    // Hapus dikelola lewat keyboard/handler sendiri agar multi-select konsisten
    return Promise.resolve(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (deleteSelectedNodes()) e.preventDefault()
        return
      }

      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveProject()
        return
      }
      if (e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void openProjectFile()
        return
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newProject()
        return
      }
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault()
        void printTopology()
        return
      }
      if (e.key.toLowerCase() === 'c') {
        if (copySelectionToClipboard()) e.preventDefault()
        return
      }
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteClipboard()
        return
      }
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelection()
        return
      }
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    saveProject,
    openProjectFile,
    newProject,
    printTopology,
    undo,
    redo,
    copySelectionToClipboard,
    pasteClipboard,
    duplicateSelection,
    deleteSelectedNodes,
  ])

  /** Geser viewport dengan panah keyboard */
  useEffect(() => {
    const PAN_STEP = 48
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key
      if (
        key !== 'ArrowUp' &&
        key !== 'ArrowDown' &&
        key !== 'ArrowLeft' &&
        key !== 'ArrowRight'
      ) {
        return
      }

      e.preventDefault()
      const vp = getViewport()
      const step = e.shiftKey ? PAN_STEP * 3 : PAN_STEP
      let { x, y } = vp
      if (key === 'ArrowRight') x -= step
      if (key === 'ArrowLeft') x += step
      if (key === 'ArrowDown') y -= step
      if (key === 'ArrowUp') y += step
      void setViewport({ ...vp, x, y })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [getViewport, setViewport])

  const openNodeArrangeMenu = useCallback(
    (clientX: number, clientY: number, focusId: string, selectedIds: string[]) => {
      const ids = selectedIds.length > 0 ? selectedIds : [focusId]
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: ids.includes(n.id),
        })),
      )
      setEdges((eds) => {
        if (!eds.some((e) => e.selected)) return eds
        return eds.map((e) => (e.selected ? { ...e, selected: false } : e))
      })

      if (ids.length >= 2) multiSelectSnapshotRef.current = ids

      const focus = nodes.find((n) => n.id === focusId) ?? nodes.find((n) => ids.includes(n.id))
      setSelectedId(focusId)
      setSelectedEdgeId(null)
      setPanelMode('node')
      if (focus?.data.type === 'onu') setSelectedOnuId(focus.id)

      setContextMenu({
        kind: 'node',
        x: clientX,
        y: clientY,
        id: focusId,
        selectedIds: ids,
      })
    },
    [nodes, setNodes, setEdges],
  )

  const onNodeContextMenu: NodeMouseHandler<Node<FoNodeData>> = useCallback((event, node) => {
    event.preventDefault()
    event.stopPropagation()

    const liveSelected = nodes.filter((n) => n.selected).map((n) => n.id)
    const snapshot = multiSelectSnapshotRef.current
    let selectedIds: string[]

    if (liveSelected.includes(node.id) && liveSelected.length >= 2) {
      selectedIds = liveSelected
    } else if (snapshot.includes(node.id) && snapshot.length >= 2) {
      selectedIds = snapshot
    } else if (liveSelected.includes(node.id)) {
      selectedIds = liveSelected
    } else {
      selectedIds = [node.id]
    }

    openNodeArrangeMenu(event.clientX, event.clientY, node.id, selectedIds)
  }, [nodes, openNodeArrangeMenu])

  const onSelectionContextMenu = useCallback(
    (event: ReactMouseEvent, selectedNodes: Node<FoNodeData>[]) => {
      event.preventDefault()
      event.stopPropagation()
      const selectedIds = selectedNodes.map((n) => n.id)
      if (selectedIds.length === 0) return
      const focusId = selectedIds[0]
      openNodeArrangeMenu(event.clientX, event.clientY, focusId, selectedIds)
    },
    [openNodeArrangeMenu],
  )

  const selectionDragRef = useRef(false)
  const selectionDragTimerRef = useRef<number | null>(null)

  const onSelectionStart = useCallback(() => {
    if (selectionDragTimerRef.current != null) {
      window.clearTimeout(selectionDragTimerRef.current)
      selectionDragTimerRef.current = null
    }
    selectionDragRef.current = true
  }, [])

  const onSelectionEnd = useCallback(() => {
    selectionDragRef.current = true
    // Pane click biasanya menyusul; jaga flag sebentar agar seleksi tidak terhapus
    if (selectionDragTimerRef.current != null) {
      window.clearTimeout(selectionDragTimerRef.current)
    }
    selectionDragTimerRef.current = window.setTimeout(() => {
      selectionDragRef.current = false
      selectionDragTimerRef.current = null
      const settled = nodesRef.current.filter((n) => n.selected).map((n) => n.id)
      if (settled.length >= 2) multiSelectSnapshotRef.current = settled
    }, 50)
  }, [])

  const onNodeClick: NodeMouseHandler<Node<FoNodeData>> = useCallback((event, node) => {
    setSelectedId(node.id)
    setSelectedEdgeId(null)
    setPanelMode('node')
    if (node.data.type === 'onu') setSelectedOnuId(node.id)
    setContextMenu(null)
    // Jangan override node.selected di sini — biarkan React Flow (Ctrl / drag-blok)
    if (!(event.ctrlKey || event.metaKey || event.shiftKey)) {
      multiSelectSnapshotRef.current = [node.id]
    }
  }, [])

  const onNodeDoubleClick: NodeMouseHandler<Node<FoNodeData>> = useCallback((_event, node) => {
    selectNode(node.id, true, node.data.type)
    setContextMenu(null)
  }, [selectNode])

  const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
    event.preventDefault()
    setContextMenu({
      kind: 'edge',
      x: event.clientX,
      y: event.clientY,
      id: edge.id,
    })
    selectEdge(edge.id, false)
  }, [selectEdge])

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setSelectedEdgeId(edge.id)
    setSelectedId(null)
    setPanelMode('edge')
    setNodes((nds) => {
      if (nds.every((n) => !n.selected)) return nds
      return nds.map((n) => ({ ...n, selected: false }))
    })
    setContextMenu(null)
  }, [setNodes])

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback((_event, edge) => {
    selectEdge(edge.id, true)
    setContextMenu(null)
  }, [selectEdge])

  const onPaneClick = useCallback(() => {
    // Setelah drag-blok, jangan hapus seleksi yang baru saja dibuat
    if (selectionDragRef.current) {
      selectionDragRef.current = false
      const selected = nodes.filter((n) => n.selected)
      const first = selected[0]
      if (first) {
        setSelectedId(first.id)
        setSelectedEdgeId(null)
        setPanelMode('node')
        if (first.data.type === 'onu') setSelectedOnuId(first.id)
      }
      if (selected.length >= 2) {
        multiSelectSnapshotRef.current = selected.map((n) => n.id)
      }
      return
    }
    multiSelectSnapshotRef.current = []
    clearSelection()
  }, [clearSelection, nodes])

  const onPaneContextMenu = useCallback((event: ReactMouseEvent | MouseEvent) => {
    // Cegah menu browser — klik kanan + seret dipakai untuk geser peta
    event.preventDefault()
  }, [])

  return (
    <div className={`app-shell${isMobile ? ' app-shell--mobile' : ''}`}>
      <ProjectToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        onNew={newProject}
        onOpen={openProjectFile}
        onSave={saveProject}
        onSaveAs={saveProjectAs}
        onExportPng={() => void exportMap('png')}
        onExportJpg={() => void exportMap('jpg')}
        onPrintTopology={() => void printTopology()}
        onUndo={undo}
        onRedo={redo}
        onOpenMaterialReport={() => {
          setReport(buildMaterialReport(nodes, projectTitle, locale, edges, appSettings))
          setShowSettingsPanel(false)
          setShowPropertiesPanel(false)
          if (isMobile) setSidebarOpen(false)
        }}
        onOpenQuantityReport={() => {
          setReport(buildQuantityReport(nodes, projectTitle, locale, edges, appSettings))
          setShowSettingsPanel(false)
          setShowPropertiesPanel(false)
          if (isMobile) setSidebarOpen(false)
        }}
        onOpenOnuLossReport={() => {
          setReport(buildOnuLossReport(nodes, projectTitle, locale))
          setShowSettingsPanel(false)
          setShowPropertiesPanel(false)
          if (isMobile) setSidebarOpen(false)
        }}
        onOpenSettings={() => {
          setShowSettingsPanel(true)
          setShowPropertiesPanel(false)
          setReport(null)
          if (isMobile) setSidebarOpen(false)
        }}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenQuick={() => {
          setShowQuickPanel(true)
          setShowSettingsPanel(false)
          setShowPropertiesPanel(false)
          setReport(null)
          if (isMobile) setSidebarOpen(false)
        }}
        updateAvailable={appUpdate.showBanner || appUpdate.status === 'available'}
        onVersionClick={() => {
          void appUpdate.checkNow()
          setShowSettingsPanel(true)
          setShowPropertiesPanel(false)
          setReport(null)
          if (isMobile) setSidebarOpen(false)
        }}
      />

      <div className="app-body">
        <Sidebar
          isMobile={isMobile}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          title={projectTitle}
          fileName={linkedFileName}
          isDirty={isDirty}
          onTitleChange={setProjectTitle}
          onDragStart={() => undefined}
          onAddComponent={addComponentAtCenter}
        />

        <div className="workspace">
        <input
          ref={fileInputRef}
          type="file"
          accept={`.json,${PROJECT_FILE_EXT},application/json`}
          hidden
          onChange={onProjectFileSelected}
        />

        {appUpdate.showBanner && appUpdate.latest ? (
          <UpdateBanner
            latest={appUpdate.latest}
            applying={appUpdate.status === 'applying'}
            error={appUpdate.error}
            progress={appUpdate.progress}
            onApply={() => {
              void appUpdate.applyUpdate()
            }}
            onDismiss={appUpdate.dismiss}
          />
        ) : null}

        <div
          className="canvas-wrap"
          ref={wrapperRef}
          onPointerDownCapture={(e) => {
            if (e.button !== 2) return
            const ids = nodes.filter((n) => n.selected).map((n) => n.id)
            if (ids.length >= 2) multiSelectSnapshotRef.current = ids
          }}
        >
          <CanvasErrorBoundary
            message={t('canvasErrorMsg')}
            recoverLabel={t('canvasErrorRecover')}
          >
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={onNodeDragStart}
            onBeforeDelete={onBeforeDelete}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            isValidConnection={isValidConnection}
            edgesReconnectable
            // Hanya area dekat ujung tali; klik badan tali = select
            reconnectRadius={16}
            // Klik tanpa geser tidak mulai reconnect / connection
            connectionDragThreshold={15}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeContextMenu={onNodeContextMenu}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeContextMenu={onEdgeContextMenu}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            onSelectionStart={onSelectionStart}
            onSelectionEnd={onSelectionEnd}
            onSelectionContextMenu={onSelectionContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={foEdgeTypes}
            connectionLineType={connectionLineTypeFromStyle(appSettings.edgePathStyle)}
            connectionMode={ConnectionMode.Strict}
            edgesFocusable
            elementsSelectable
            selectionOnDrag={!isMobile}
            selectionMode={SelectionMode.Partial}
            // Desktop: middle-mouse / Space+drag. Mobile: one-finger pan.
            panOnDrag={isMobile ? true : [1]}
            panActivationKeyCode={isMobile ? null : 'Space'}
            zoomOnPinch
            zoomOnDoubleClick={!isMobile}
            minZoom={0}
            maxZoom={2}
            multiSelectionKeyCode={isMobile ? null : ['Control', 'Meta']}
            fitView
            deleteKeyCode={null}
            onError={(_, message) => {
              console.warn('React Flow:', message)
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.8}
              color={theme === 'dark' ? '#57534e' : '#a8a29e'}
            />
            <ZoomControls />
          </ReactFlow>
          </CanvasErrorBoundary>

          <NodeContextMenu
            menu={contextMenu}
            onCopyNodes={duplicateNodesByIds}
            onDeleteNodes={deleteNodes}
            onNodeProperties={(nodeId) => {
              const node = nodes.find((n) => n.id === nodeId)
              selectNode(nodeId, true, node?.data.type)
            }}
            onArrange={arrangeSelection}
            onDeleteEdge={deleteEdge}
            onEdgeProperties={(edgeId) => selectEdge(edgeId, true)}
            onClose={() => setContextMenu(null)}
          />

          <div className="app-copyright" aria-hidden="true">
            Copyright © {new Date().getFullYear()} JERIYANT - BARAMCITY
        </div>
        </div>
        </div>
      </div>

      {report ? <ReportPanel report={report} onClose={() => setReport(null)} /> : null}

      {!showSettingsPanel && showPropertiesPanel ? (
        <div
          className="panel-overlay"
                  role="presentation"
          onMouseDown={() => setShowPropertiesPanel(false)}
        >
          <div
            className="panel-overlay-card"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {panelMode === 'edge' ? (
              <EdgePropertiesPanel
                edge={selectedEdge}
                nodes={nodes}
                settings={appSettings}
                onChange={updateEdgeData}
                onDelete={deleteEdge}
                onClose={() => setShowPropertiesPanel(false)}
              />
            ) : (
              <PropertiesPanel
                node={selectedNode}
                allLabels={nodes.map((n) => n.data.label)}
                settings={appSettings}
                onChange={updateNodeData}
                onDelete={deleteNode}
                onClose={() => setShowPropertiesPanel(false)}
              />
            )}
          </div>
        </div>
      ) : null}

      {showSettingsPanel ? (
        <div
          className="settings-overlay"
                  role="presentation"
          onMouseDown={() => setShowSettingsPanel(false)}
        >
          <div
            className="settings-overlay-card"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SettingsPanel
              settings={appSettings}
              theme={theme}
              onThemeChange={onThemeChange}
              onSave={updateAppSettings}
              onClose={() => setShowSettingsPanel(false)}
              update={appUpdate}
            />
        </div>
        </div>
      ) : null}

      {showQuickPanel ? (
        <div
          className="settings-overlay"
          role="presentation"
          onMouseDown={() => setShowQuickPanel(false)}
        >
          <div
            className="settings-overlay-card quick-overlay-card"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <QuickPanel
              oltPorts={appSettings.oltPorts}
              splitterRatios={appSettings.splitterRatios}
              defaultStartRatio={appSettings.splitterRatio}
              onClose={() => setShowQuickPanel(false)}
              onGenerate={generateQuickTopology}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('fo-locale')
    return saved === 'en' || saved === 'id' ? saved : 'id'
  })
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const initial = loadTheme()
    applyTheme(initial)
    return initial
  })

  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const i18n = useMemo(
    () =>
      createI18nValue(locale, (next) => {
        localStorage.setItem('fo-locale', next)
        setLocale(next)
      }),
    [locale],
  )

  return (
    <I18nContext.Provider value={i18n}>
      <ReactFlowProvider>
        <SimulatorCanvas theme={theme} onThemeChange={setTheme} />
      </ReactFlowProvider>
    </I18nContext.Provider>
  )
}
