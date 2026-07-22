import { Fragment } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/translations'

/** Empat sisi dua arah — tidak ada beda in/out; tiap titik bisa sumber atau tujuan. */
export const QUAD_SIDES = [
  { position: Position.Top, id: 'top', sideKey: 'sideTop' as const },
  { position: Position.Left, id: 'left', sideKey: 'sideLeft' as const },
  { position: Position.Right, id: 'right', sideKey: 'sideRight' as const },
  { position: Position.Bottom, id: 'bottom', sideKey: 'sideBottom' as const },
] as const

export const QUAD_SIDE_IDS = new Set(QUAD_SIDES.map((s) => s.id))

type Props = {
  autoHandleClass: (handleId: string, baseClass: string) => string
}

export function QuadSideHandles({ autoHandleClass }: Props) {
  const { t, tf } = useI18n()

  return (
    <>
      {QUAD_SIDES.map(({ position, id, sideKey }) => {
        const title = tf('portSide', { side: t(sideKey as TranslationKey) })
        return (
          <Fragment key={id}>
            <Handle
              type="target"
              position={position}
              id={id}
              className={autoHandleClass(id, 'fo-handle fo-side-handle')}
              title={title}
            />
            <Handle
              type="source"
              position={position}
              id={id}
              className={autoHandleClass(id, 'fo-handle fo-side-handle')}
              title={title}
            />
          </Fragment>
        )
      })}
    </>
  )
}
