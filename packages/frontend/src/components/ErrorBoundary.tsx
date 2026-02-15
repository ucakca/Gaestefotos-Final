'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

/**
 * Global Error Boundary
 * Catches React errors and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry or similar
      // logErrorToService(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-terracotta-50 p-4">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-lg shadow-xl p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-destructive/15 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center text-foreground mb-3">
                Etwas ist schiefgelaufen
              </h1>

              <p className="text-center text-muted-foreground mb-6">
                Es tut uns leid, aber es ist ein unerwarteter Fehler aufgetreten.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="font-mono text-sm text-destructive break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-destructive hover:text-destructive">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-destructive overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Erneut versuchen
                </button>

                <button
                  onClick={this.handleReload}
                  className="w-full bg-muted/80 hover:bg-muted/60 text-foreground font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Seite neu laden
                </button>

                <button
                  onClick={() => (window.location.href = '/dashboard')}
                  className="w-full text-forest-700 hover:text-forest-900 font-medium py-2"
                >
                  Zum Dashboard
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Problem besteht weiter?{' '}
                <a
                  href="/faq"
                  className="text-terracotta-600 hover:text-terracotta-700 font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kontaktiere den Support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
