import { useCallback, useEffect, useState } from 'react'
import { useNodeId, useReactFlow } from '@xyflow/react'
import { useI18n } from '../i18n/context'

type Props = {
  comment: string
}

export function NodeComment({ comment }: Props) {
  const { t } = useI18n()
  const id = useNodeId()
  const { setNodes } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment)

  useEffect(() => {
    if (!editing) setDraft(comment)
  }, [comment, editing])

  const commit = useCallback(() => {
    if (!id) return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, comment: draft.trim() } } : n,
      ),
    )
    setEditing(false)
  }, [id, draft, setNodes])

  if (editing) {
    return (
      <textarea
        className="fo-comment-input nodrag nopan nowheel"
        value={draft}
        rows={2}
        placeholder={t('commentPlaceholder')}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(comment)
            setEditing(false)
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  if (!comment.trim()) return null

  return (
    <div
      className="fo-comment nodrag"
      onDoubleClick={(e) => {
        e.stopPropagation()
        setDraft(comment)
        setEditing(true)
      }}
      title={t('comment')}
    >
      {comment}
    </div>
  )
}
