import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept local: this prototype sends no telemetry anywhere.
    console.error("SmartLoop render error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-lift">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-ink-900">
            SmartLoop hit an unexpected error
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
            The demo could not render this view. Reloading usually restores the simulated dataset.
          </p>
          {this.state.message ? (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-50 px-3 py-2 text-left text-[10px] text-ink-500">
              {this.state.message}
            </pre>
          ) : null}
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reload prototype
            </button>
            <a
              href="#/"
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="inline-flex h-9 items-center rounded-xl border border-line bg-white px-4 text-xs font-medium text-ink-600 hover:bg-ink-50"
            >
              Go to dashboard
            </a>
          </div>
          <p className="mt-4 text-[10px] text-ink-400">
            SmartLoop uses simulated data. No live campus systems are connected.
          </p>
        </div>
      </div>
    );
  }
}
