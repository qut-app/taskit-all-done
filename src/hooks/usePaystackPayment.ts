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

  const generateReference = (userId: string) => {
    return `sub_${userId}_${Date.now()}`;
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
    // === STEP 1: Validate email ===
    if (!user?.email || typeof user.email !== 'string' || !user.email.includes('@')) {
      console.error('[Paystack Debug] Invalid email:', user?.email);
      toast({ title: 'Error', description: 'Please log in to subscribe', variant: 'destructive' });
      return;
    }

    // === STEP 2: Validate amount ===
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0 || !Number.isFinite(numericAmount)) {
      console.error('[Paystack Debug] Invalid amount:', { raw: amount, parsed: numericAmount });
      toast({ title: 'Error', description: 'Invalid payment amount', variant: 'destructive' });
      return;
    }

    // === STEP 3: Validate subscription type ===
    if (!subscriptionType || typeof subscriptionType !== 'string') {
      console.error('[Paystack Debug] Invalid subscriptionType:', subscriptionType);
      toast({ title: 'Error', description: 'Please select a subscription plan', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await loadPaystackScript();

      // === STEP 4: Generate unique reference ===
      const reference = generateReference(user.id);

      // === STEP 5: Convert to kobo (integer, no decimals) ===
      const amountInKobo = Math.round(numericAmount * 100);

      // === STEP 6: Full debug payload ===
      const debugPayload = {
        email: user.email,
        amount_naira: numericAmount,
        amount_kobo: amountInKobo,
        amount_type: typeof amountInKobo,
        currency: 'NGN',
        reference,
        subscription_type: subscriptionType,
        user_id: user.id,
      };
      console.log('[Paystack Debug] Full payload before server call:', JSON.stringify(debugPayload, null, 2));

      // Final guard
      if (amountInKobo < 100) {
        console.error('[Paystack Debug] Amount too small:', amountInKobo, 'kobo');
        toast({ title: 'Error', description: 'Minimum payment is ₦1', variant: 'destructive' });
        return;
      }

      // === STEP 7: Server-side initialization ===
      const { data, error } = await supabase.functions.invoke('initialize-subscription', {
        body: {
          amount: amountInKobo,
          email: user.email,
          reference,
          subscription_type: subscriptionType,
        },
      });

      console.log('[Paystack Debug] Server response:', JSON.stringify(data), 'Error:', error);

      if (error) {
        throw new Error('Unable to initialize payment. Please try again.');
      }

      const accessCode = data?.access_code;
      const publicKey = data?.public_key;

      if (!accessCode || !publicKey) {
        console.error('[Paystack Debug] Missing access_code or public_key:', { accessCode: !!accessCode, publicKey: !!publicKey });
        throw new Error('Payment setup incomplete. Please try again later.');
      }

      console.log('[Paystack Debug] Opening popup with:', { key: publicKey?.substring(0, 10) + '...', access_code: accessCode?.substring(0, 10) + '...', ref: reference });

      // === STEP 8: Open popup — NO amount when using access_code ===
      const popup = new window.PaystackPop();
      popup.newTransaction({
        key: publicKey,
        access_code: accessCode,
        email: user.email,
        amount: amountInKobo,
        currency: 'NGN',
        ref: reference,
        onSuccess: (transaction: any) => {
          console.log('[Paystack Debug] Payment success:', transaction);
          toast({ title: 'Payment successful!', description: 'Your subscription is now active.' });
          onSuccess?.(transaction.reference || reference);
        },
        onCancel: () => {
          console.log('[Paystack Debug] Payment cancelled by user');
          toast({ title: 'Payment cancelled', description: 'You can try again anytime.' });
          onCancel?.();
        },
      });
    } catch (err: any) {
      console.error('[Paystack Debug] Payment error:', err);
      const message = err.message?.includes('Paystack') || err.message?.includes('invalid')
        ? 'Unable to process payment. Please check your details and try again.'
        : err.message || 'Failed to initialize payment';
      toast({ title: 'Payment Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return {
    initializePayment,
    loading,
  };
}
