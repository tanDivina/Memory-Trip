import React from 'react';
import Button from './Button';
import Card from './Card';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 text-center">
          <h2 id="confirmation-modal-title" className="text-2xl font-bold font-display mb-2">{title}</h2>
          <p className="text-brand-text-muted mb-6">{message}</p>
          <div className="flex justify-center gap-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white">
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmationModal;
