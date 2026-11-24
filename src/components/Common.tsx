import { Component, useId, type ReactNode } from 'react';
import katex from 'katex';
import { Dna, Info, X } from 'lucide-react';
export function Logo() {
  return (
    <span className="logo">
      <svg width="32" height="38" viewBox="0 0 32 40" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M6 3C6 19 26 21 26 37M26 3C26 19 6 21 6 37M8 9H24M12 16H20M12 24H20M8 31H24" />
        </g>
      </svg>
      <span>
        Gen<span className="text-accent">X</span>
        <small>EVOLUTION IN ACTION</small>
      </span>
    </span>
  );
}
export function Formula({ value }: { value: string }) {
  return (
    <div
      className="formula"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, {
          throwOnError: false,
          output: 'html',
          strict: 'ignore',
        }),
      }}
    />
  );
}
export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h3>{title}</h3>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label id={id}>
        {label}{' '}
        {tip && (
          <span tabIndex={0} className="tip" aria-label={tip}>
            <Info size={13} />
            <span role="tooltip">{tip}</span>
          </span>
        )}
      </label>
      <div aria-labelledby={id}>{children}</div>
    </div>
  );
}
export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'violet' | 'amber' | 'muted';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="panel-heading">
          <h2>
            <Dna size={24} />
            {title}
          </h2>
          <button className="icon-button" aria-label="Close inspector" onClick={onClose} autoFocus>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="error-screen">
        <h1>Let’s restart this experiment.</h1>
        <p>{this.state.error}</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Reload GenX
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export const format = (n: number, digits = 2) =>
  Number.isFinite(n)
    ? n !== 0 && Math.abs(n) < 10 ** -digits
      ? n.toExponential(2)
      : new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(n)
    : '—';
