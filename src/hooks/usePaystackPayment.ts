import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaystackPaymentOptions {
  amount: number; // in Naira
  subscriptionType: string;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}

export function usePaystackPayment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const generateReference = () => {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const loadPaystackScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Paystack'));
      document.head.appendChild(script);
    });
  };

  const initializePayment = async ({ amount, subscriptionType, onSuccess, onCancel }: PaystackPaymentOptions) => {
    if (!user?.email) {
      toast({ title: 'Error', description: 'Please log in to subscribe', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await loadPaystackScript();

      const reference = generateReference();
      const amountInKobo = amount * 100;

      // Initialize transaction server-side
      const { data, error } = await supabase.functions.invoke('initialize-subscription', {
        body: {
          amount: amountInKobo,
          email: user.email,
          reference,
          subscription_type: subscriptionType,
        },
      });

      if (error) throw error;

      const accessCode = data?.access_code;
      if (!accessCode) throw new Error('No access code received');

      // Open Paystack popup - do NOT pass amount when using access_code
      const popup = new window.PaystackPop();
      popup.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || data?.public_key,
        access_code: accessCode,
        email: user.email,
        ref: reference,
        onSuccess: (transaction: any) => {
          toast({ title: 'Payment successful!', description: 'Your subscription is now active.' });
          onSuccess?.(transaction.reference || reference);
        },
        onCancel: () => {
          toast({ title: 'Payment cancelled', description: 'You can try again anytime.' });
          onCancel?.();
        },
      });
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({ title: 'Payment Error', description: err.message || 'Failed to initialize payment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return {
    initializePayment,
    loading,
  };
}
