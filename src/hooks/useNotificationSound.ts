import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Generate a soft notification tone using Web Audio API
function playNotificationTone() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.08); // C#6
    oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.16); // E6
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
    
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // Silent fail - sound is non-critical
  }
}

export function useNotificationSound() {
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastPlayedRef = useRef<string | null>(null);

  // Load preference from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('sound_notifications_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSoundEnabled((data as any).sound_notifications_enabled ?? true);
        }
      });
  }, [user]);

  const playSound = useCallback((notificationId: string) => {
    if (!soundEnabled) return;
    // Prevent duplicate plays for same notification
    if (lastPlayedRef.current === notificationId) return;
    lastPlayedRef.current = notificationId;
    playNotificationTone();
  }, [soundEnabled]);

  const toggleSound = useCallback(async (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (user) {
      await supabase
        .from('profiles')
        .update({ sound_notifications_enabled: enabled } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  return { soundEnabled, playSound, toggleSound };
}
