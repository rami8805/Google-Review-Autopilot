import React from 'react';
import { OnboardingWizard } from '../features/onboarding/OnboardingWizard';
import type { BusinessLocation, BrandVoice } from '../../shared/types/domain';

interface OnboardingPageProps {
  location: BusinessLocation;
  brandVoice?: BrandVoice;
  onComplete: (data: {
    businessType: string;
    businessName: string;
    brandTone: BrandVoice['tone'];
    automationMode: 'SAFE' | 'BALANCED' | 'FULL';
  }) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  location,
  brandVoice,
  onComplete,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8">
      <OnboardingWizard
        location={location}
        brandVoice={brandVoice}
        onComplete={onComplete}
      />
    </div>
  );
};
