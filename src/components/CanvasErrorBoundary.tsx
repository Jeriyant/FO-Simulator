import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onReset?: () => void
  message: string
  recoverLabel: string
}

type State = {
  error: Error | null
}

/** Cegah layar putih total jika React Flow / edge throw saat interaksi. */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Canvas error:', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="canvas-error">
          <p>{this.props.message}</p>
          <p className="canvas-error-detail">{this.state.error.message}</p>
          <button type="button" onClick={this.reset}>
            {this.props.recoverLabel}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
