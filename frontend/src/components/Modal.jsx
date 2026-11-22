export default function Modal({ title, children, onClose, size = '' }) {
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className={`modal-panel ${size}`} role="dialog" aria-modal="true" aria-label={title}>
      {children}
    </section>
  </div>;
}
