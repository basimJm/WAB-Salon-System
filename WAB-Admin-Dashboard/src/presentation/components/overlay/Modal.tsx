import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDialogBehavior } from '../../hooks/useDialogBehavior';
import { IconButton } from '../core/IconButton';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Accessible dialog: Esc closes, focus is trapped, then restored to the opener. */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, panel, onClose);

  if (!open) return null;
  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- backdrop click is a pointer shortcut; Esc and the close button are the accessible paths
    <div
      className="wab-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="wab-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="wab-modal__header">
          <h2 id={titleId} className="wab-modal__title">
            {title}
          </h2>
          <IconButton icon="close" label={t('common.close')} onClick={onClose} />
        </header>
        <div className="wab-modal__body">{children}</div>
        {footer ? <footer className="wab-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
