import React from 'react';

interface ViewErrorBoundaryProps {
  children: React.ReactNode;
}

interface ViewErrorBoundaryState {
  failed: boolean;
  message: string;
}

/**
 * Safety net around lazily loaded views: a failed module load or render
 * error shows a message with recovery instead of blanking the app.
 */
export class ViewErrorBoundary extends React.Component<
  ViewErrorBoundaryProps,
  ViewErrorBoundaryState
> {
  state: ViewErrorBoundaryState = { failed: false, message: '' };

  static getDerivedStateFromError(error: unknown): ViewErrorBoundaryState {
    return {
      failed: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  componentDidCatch(error: unknown): void {
    console.error('View failed to render.', error);
  }

  private handleRetry = () => {
    this.setState({ failed: false, message: '' });
  };

  render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-background">
          <p className="text-xs font-semibold tracking-[0.2em] text-error uppercase">
            Something went wrong
          </p>
          <p className="text-xs text-muted max-w-md break-words">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-1 px-6 min-h-[44px] bg-accent text-accent-ink font-bold text-[11px] tracking-[0.14em] rounded hover:brightness-110 active:scale-[0.98] transition-all duration-200"
          >
            TRY AGAIN
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
