import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SATSHIELD Caught Error]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-xl bg-black border border-red-500/40 text-red-400 font-sans flex flex-col items-center justify-center text-center space-y-2 my-2">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>{this.props.fallbackTitle || 'Component Temporarily Unavailable'}</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm">
            {this.state.error?.message || 'A minor interface rendering anomaly occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-white/20 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RETRY</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
