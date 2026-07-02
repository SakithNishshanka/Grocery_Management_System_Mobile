import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native/lib/commonjs/components/StripeProvider';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const hasStripeKey =
  STRIPE_PUBLISHABLE_KEY &&
  (STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') || STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_'));

export default function StripeProviderWrapper({ children }) {
  if (!hasStripeKey) {
    return <>{children}</>;
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      {children}
    </StripeProvider>
  );
}
