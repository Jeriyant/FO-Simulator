/** Util CIDR: 192.168.1.1/24 */

export function prefixToDottedMask(prefix: number): string {
  const p = Math.min(32, Math.max(0, Math.floor(prefix)))
  const mask = p === 0 ? 0 : (~0 << (32 - p)) >>> 0
  return [
    (mask >>> 24) & 255,
    (mask >>> 16) & 255,
    (mask >>> 8) & 255,
    mask & 255,
  ].join('.')
}

export function dottedMaskToPrefix(mask: string): number | null {
  const parts = mask.trim().split('.').map((x) => Number(x))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return null
  }
  let bits = 0
  let seenZero = false
  for (const octet of parts) {
    for (let i = 7; i >= 0; i--) {
      const bit = (octet >> i) & 1
      if (bit === 1) {
        if (seenZero) return null
        bits++
      } else {
        seenZero = true
      }
    }
  }
  return bits
}

export type ParsedCidr = {
  ip: string
  prefix: number
  mask: string
}

/** Parse "192.168.1.1/24" atau IP + mask bertitik (legacy). */
export function parseCidr(input: string): ParsedCidr | null {
  const raw = input.trim()
  if (!raw) return null

  const slash = raw.match(
    /^(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})$/,
  )
  if (slash) {
    const ip = slash[1]
    const prefix = Number(slash[2])
    if (!isValidIpv4(ip) || prefix < 0 || prefix > 32) return null
    return { ip, prefix, mask: prefixToDottedMask(prefix) }
  }

  // Legacy: hanya IP
  if (isValidIpv4(raw)) {
    return { ip: raw, prefix: 24, mask: prefixToDottedMask(24) }
  }
  return null
}

export function formatCidr(ip: string, prefixOrMask: string | number): string {
  const ipTrim = ip.trim()
  if (!ipTrim) return ''
  if (typeof prefixOrMask === 'number') {
    return `${ipTrim}/${prefixOrMask}`
  }
  const m = prefixOrMask.trim()
  if (m.startsWith('/')) {
    return `${ipTrim}${m}`
  }
  if (/^\d{1,2}$/.test(m)) {
    return `${ipTrim}/${m}`
  }
  const p = dottedMaskToPrefix(m)
  return `${ipTrim}/${p ?? 24}`
}

export function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.').map((x) => Number(x))
  return (
    parts.length === 4 &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  )
}

/** Prefix display: "/24" */
export function formatPrefix(prefixOrMask: string | number | null | undefined): string {
  if (prefixOrMask == null || prefixOrMask === '') return '—'
  if (typeof prefixOrMask === 'number') return `/${prefixOrMask}`
  const s = String(prefixOrMask).trim()
  if (s.startsWith('/')) return s
  if (/^\d{1,2}$/.test(s)) return `/${s}`
  const p = dottedMaskToPrefix(s)
  return p != null ? `/${p}` : s
}

export type DhcpResolved = {
  gateway: string
  prefix: number
  mask: string
  cidr: string
}

/** Resolve DHCP config: utamakan cidr, fallback gateway+subnetMask lama. */
export function resolveDhcpCidr(dhcp: {
  cidr?: string
  gateway?: string
  subnetMask?: string
}): DhcpResolved | null {
  if (dhcp.cidr?.trim()) {
    const parsed = parseCidr(dhcp.cidr)
    if (parsed) {
      return {
        gateway: parsed.ip,
        prefix: parsed.prefix,
        mask: parsed.mask,
        cidr: formatCidr(parsed.ip, parsed.prefix),
      }
    }
  }
  if (dhcp.gateway?.trim()) {
    const gw = dhcp.gateway.trim()
    const prefix =
      dottedMaskToPrefix(dhcp.subnetMask ?? '') ??
      (dhcp.subnetMask?.startsWith('/')
        ? Number(dhcp.subnetMask.slice(1))
        : 24)
    const p = Number.isFinite(prefix) ? Number(prefix) : 24
    return {
      gateway: gw,
      prefix: p,
      mask: prefixToDottedMask(p),
      cidr: formatCidr(gw, p),
    }
  }
  return null
}

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return null
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

/**
 * Turunkan pool DHCP dari gateway CIDR.
 * Contoh: 192.168.2.1/24 → 192.168.2.10 … 192.168.2.250
 */
export function deriveDhcpPoolFromCidr(cidr: string): { poolStart: string; poolEnd: string } | null {
  const parsed = parseCidr(cidr)
  if (!parsed) return null
  const gw = ipToInt(parsed.ip)
  const maskInt = ipToInt(parsed.mask)
  if (gw == null || maskInt == null) return null

  const network = (gw & maskInt) >>> 0
  const broadcast = (network | (~maskInt >>> 0)) >>> 0
  const hostMin = (network + 1) >>> 0
  const hostMax = (broadcast - 1) >>> 0
  if (hostMin > hostMax) return null

  let start = Math.min(hostMax, Math.max(hostMin, (network + 10) >>> 0))
  let end = Math.min(hostMax, Math.max(start, (network + 250) >>> 0))

  if (start === gw) start = (start + 1) >>> 0
  if (end === gw) end = (end - 1) >>> 0
  if (start > end) {
    start = hostMin === gw ? ((hostMin + 1) >>> 0) : hostMin
    end = hostMax === gw ? ((hostMax - 1) >>> 0) : hostMax
  }
  if (start > end || start === gw || end === gw) return null

  return { poolStart: intToIp(start), poolEnd: intToIp(end) }
}
