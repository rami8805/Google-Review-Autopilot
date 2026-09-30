import React from 'react';
import { SupportWidget } from '../features/support/SupportWidget';

interface SupportPageProps {
  userEmail: string;
}

export const SupportPage: React.FC<SupportPageProps> = ({ userEmail }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupportWidget userEmail={userEmail} />
    </div>
  );
};
