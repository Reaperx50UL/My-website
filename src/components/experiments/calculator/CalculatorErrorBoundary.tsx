"use client";

import React, { Component, type ReactNode } from 'react';
import { CalculatorErrorFallback } from './CalculatorLoadingIndicator';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CalculatorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Calculator Tool Error]:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <CalculatorErrorFallback
          title={this.props.fallbackTitle ?? 'Failed to load tool'}
          message={
            this.state.error?.message ??
            this.props.fallbackMessage ??
            'An error occurred while loading this module. Click retry to reload.'
          }
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
