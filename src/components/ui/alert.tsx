import React, { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function Alert({ children, type = 'info' }: AlertProps) {
  const styles = {
    info: 'bg-blue-500/20 border border-blue-500 text-blue-100',
    success: 'bg-green-500/20 border border-green-500 text-green-100',
    warning: 'bg-yellow-500/20 border border-yellow-500 text-yellow-100',
    error: 'bg-red-500/20 border border-red-500 text-red-100',
  };

  return (
    <div className={`rounded-lg p-4 ${styles[type]}`}>
      {children}
    </div>
  );
}
