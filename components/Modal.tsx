// components/Modal.tsx

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void; // Optional for confirmation dialogs
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'danger' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  confirmButtonVariant = 'primary',
  isLoading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling the body
    } else {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // Restore scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-80 backdrop-blur-sm"
      onClick={(e) => {
        // Close modal if clicked outside modal content
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative bg-gray-800 border border-white/10 rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-hidden text-gray-200"
      >
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <h3 id="modal-title" className="text-xl sm:text-2xl font-semibold text-white">
            {title}
          </h3>
          <button onClick={onClose} aria-label="Close modal" className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="py-6 overflow-y-auto flex-grow custom-scrollbar">
          {children}
        </div>

        {onConfirm && (
          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              {cancelButtonText}
            </Button>
            <Button variant={confirmButtonVariant} onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmButtonText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
