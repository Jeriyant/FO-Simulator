import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useI18n } from '../i18n/context'
import type { InternetData } from '../types/fo'
import { resolveDhcpCidr } from '../utils/cidr'
import { NodeComment } from './NodeComment'
import './nodes.css'

type InternetNodeType = Node<InternetData, 'internet'>

export function InternetNode({ data, selected }: NodeProps<InternetNodeType>) {
  const { t } = useI18n()
  const dhcp = data.dhcpServer
  const cidr = dhcp ? resolveDhcpCidr(dhcp)?.cidr : null
  const dhcpOn = Boolean(dhcp?.enabled)

  return (
    <div className={`fo-internet ${selected ? 'selected' : ''} ${dhcpOn ? 'is-dhcp' : ''}`}>
      <Handle
        type="source"
        position={Position.Right}
        id="wan-out"
        className="fo-handle fo-lan-handle"
        style={{ top: '52%' }}
        title="WAN Out"
      />

      <div className="fo-internet-card">
        <div className="fo-internet-art" aria-hidden="true">
          <svg className="fo-internet-svg" viewBox="0 0 180 112" fill="none">
            <defs>
              <linearGradient id="inet-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
              <linearGradient id="inet-globe" x1="0.2" y1="0" x2="0.9" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="55%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="inet-cloud" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e0f2fe" />
              </linearGradient>
              <filter id="inet-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Soft ground glow */}
            <ellipse cx="90" cy="102" rx="52" ry="6" fill="#0284c7" opacity="0.16" />

            {/* Orbit rings */}
            <ellipse
              className="fo-inet-orbit"
              cx="90"
              cy="48"
              rx="54"
              ry="22"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeDasharray="3 5"
              opacity="0.55"
            />
            <ellipse
              className="fo-inet-orbit fo-inet-orbit-2"
              cx="90"
              cy="48"
              rx="42"
              ry="34"
              stroke="#7dd3fc"
              strokeWidth="1.2"
              strokeDasharray="2 6"
              opacity="0.4"
            />

            {/* Globe */}
            <circle cx="90" cy="48" r="28" fill="url(#inet-globe)" filter="url(#inet-soft)" />
            <ellipse
              cx="90"
              cy="48"
              rx="12"
              ry="28"
              stroke="#e0f2fe"
              strokeWidth="1.3"
              opacity="0.55"
            />
            <path
              d="M62 48h56M68 36c8 4 28 4 36 0M68 60c8-4 28-4 36 0"
              stroke="#bae6fd"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.7"
            />
            <circle cx="90" cy="48" r="28" stroke="#075985" strokeWidth="1.5" opacity="0.35" />

            {/* Signal nodes on orbit */}
            <circle className="fo-inet-dot" cx="36" cy="48" r="3.2" fill="#38bdf8" />
            <circle className="fo-inet-dot fo-inet-dot-2" cx="144" cy="48" r="3.2" fill="#0ea5e9" />
            <circle className="fo-inet-dot fo-inet-dot-3" cx="90" cy="14" r="2.6" fill="#7dd3fc" />

            {/* Cloud overlay (bottom-front) */}
            <g className="fo-inet-cloud">
              <path
                d="M48 78c0-9 7-16 17-16 3-8 11-13 20-12 9 1 15 7 17 14 9 1 16 8 15 16H50c-4-1-5-7-2-10z"
                fill="url(#inet-cloud)"
                stroke="#7dd3fc"
                strokeWidth="1.6"
              />
              <path
                d="M58 74c2-5 7-9 13-9 2-5 7-8 13-7 5 1 9 5 10 9"
                stroke="#bae6fd"
                strokeWidth="1.5"
                fill="none"
                opacity="0.85"
              />
            </g>
          </svg>
        </div>

        <div className="fo-internet-body">
          <strong className="fo-internet-title">{data.label}</strong>
          <span className="fo-internet-brand">{data.brand || t('comp_internet')}</span>
          <div className={`fo-internet-dhcp ${dhcpOn ? 'on' : 'off'}`}>
            <span className="fo-internet-dhcp-pill">
              DHCP {dhcpOn ? 'ON' : 'OFF'}
            </span>
            {dhcpOn && cidr ? <em>{cidr}</em> : null}
          </div>
          <NodeComment comment={data.comment ?? ''} />
        </div>
      </div>
    </div>
  )
}
