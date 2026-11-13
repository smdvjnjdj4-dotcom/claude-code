import { Component, type ReactNode } from 'react';
import { translate } from '@/lib/i18n';
import { useVybe } from '@/store/useVybe';

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[VYBE]', error);
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    const lang = useVybe.getState().settings.lang;
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center">
        <h2 className="font-display text-xl font-semibold">{translate(lang, 'err.title')}</h2>
        <p className="mt-2 text-sm text-muted">{translate(lang, 'err.text')}</p>
        <button className="mt-6 rounded-2xl bg-gradient-accent px-5 py-3 text-sm font-medium text-white" onClick={() => location.reload()}>
          {translate(lang, 'err.retry')}
        </button>
      </div>
    );
  }
}
