import { Component, type ReactNode, type ErrorInfo } from 'react';
import { GIcon } from './GIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled page exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="glass-panel max-w-lg w-full border border-[#ff453a]/30 bg-gradient-to-b from-[#ff453a]/10 via-black/80 to-black/90 p-6 sm:p-8 rounded-2xl shadow-2xl text-left fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff453a]/20 border border-[#ff453a]/40 text-[#ff453a]">
                <GIcon name="warning" size={22} />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-white leading-tight">
                  View Execution Interrupted
                </h2>
                <p className="text-[12px] text-war-text-muted mt-0.5">
                  An isolated error occurred while rendering this module.
                </p>
              </div>
            </div>

            <div className="my-4 rounded-xl border border-white/10 bg-black/50 p-3.5 text-[13px] text-war-text-secondary font-mono leading-relaxed overflow-x-auto">
              <p className="text-[#ff453a] font-semibold break-all">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime exception'}
              </p>
            </div>

            {this.state.error?.stack && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center gap-1.5 text-[12px] text-war-text-muted hover:text-white transition"
                >
                  <GIcon name={this.state.showDetails ? 'expand_less' : 'expand_more'} size={16} />
                  <span>{this.state.showDetails ? 'Hide Stack Trace' : 'Show Technical Stack Trace'}</span>
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/70 p-3 text-[11px] font-mono text-war-text-muted leading-tight whitespace-pre-wrap break-all">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="apple-button bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#409cff] transition flex items-center gap-1.5"
              >
                <GIcon name="refresh" size={16} />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="apple-button bg-white/10 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/20 transition flex items-center gap-1.5"
              >
                <GIcon name="dashboard" size={16} />
                <span>Return to Dashboard</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="apple-button bg-transparent px-3 py-2 text-[12px] text-war-text-muted hover:text-white transition flex items-center gap-1 ml-auto"
              >
                <GIcon name="restart_alt" size={15} />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
