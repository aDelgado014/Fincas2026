import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
          <h1 className="text-xl font-bold mb-2">Algo ha ido mal</h1>
          <p className="mb-4">La aplicación ha encontrado un error inesperado.</p>
          <pre className="bg-red-100 p-4 rounded overflow-auto text-sm">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
