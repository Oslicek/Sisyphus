import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Něco se pokazilo</h1>
          <p>Omlouváme se, došlo k chybě při načítání stránky.</p>
          <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', margin: '1rem auto', maxWidth: '600px' }}>
            <summary>Detaily chyby</summary>
            <p>{this.state.error?.message}</p>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>Obnovit stránku</button>
        </div>
      );
    }

    return this.props.children;
  }
}

