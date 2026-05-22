import { useMemo } from 'react';
import { useAccount } from '../context/AccountContext';

export function useSubscription() {
  const { account } = useAccount();

  return useMemo(() => {
    const status   = account?.subscription_status || 'trialing';
    const trialEnd = account?.trial_ends_at ? new Date(account.trial_ends_at) : null;
    const now      = new Date();
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : null;

    const isActive    = status === 'active';
    const isTrialing  = status === 'trialing';
    const isCancelled = status === 'cancelled' || status === 'cancel_at_period_end';
    const isExpired   = isTrialing && daysLeft === 0;
    const trialUrgent = isTrialing && daysLeft !== null && daysLeft <= 3;
    // Show upsell only when NOT active and NOT new (daysLeft > 3 = still plenty of time)
    const showUpsellBanner = !isActive && trialUrgent;
    const showCancelOffer  = isCancelled;

    return {
      status, daysLeft, trialEnd,
      isActive, isTrialing, isCancelled, isExpired,
      trialUrgent, showUpsellBanner, showCancelOffer,
      plan: account?.plan || 'starter',
    };
  }, [account]);
}
