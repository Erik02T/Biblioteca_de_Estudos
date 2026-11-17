import { useId, type ComponentProps, type KeyboardEvent, type ReactElement } from 'react';

// Keep Tab cycling inside the active modal; desktop modeless tools remain free to leave.
export function containModalTab(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.nativeEvent.isComposing || !event.currentTarget.matches(':modal')) return;
  const dialog = event.currentTarget;
  const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [tabindex]'))
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
  const first = controls[0], last = controls.at(-1);
  if (!first || !last) { event.preventDefault(); return; }
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey && (active === first || (active?.tabIndex ?? -1) < 0)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault(); first.focus();
  }
}

export function Button({ className = '', type = 'button', ...props }: ComponentProps<'button'>) {
  return <button type={type} className={`ui-button ${className}`} {...props} />;
}
export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`ui-input ${className}`} {...props} />;
}
export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`ui-input ${className}`} {...props} />;
}
export function Field({ label, children }: { label: string; children: ReactElement }) {
  const id = useId();
  return <label className="ui-field" aria-labelledby={id}><span id={id}>{label}</span>{children}</label>;
}
