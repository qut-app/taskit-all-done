export const SUBSCRIPTION_PLANS = {
  service_provider: {
    price: 4500,
    currency: "NGN",
    name: "Pro Service Provider",
    label: "Slot Boost",
    type: "provider_slot_boost" as const,
    description: "Get extra job slots and priority in discovery.",
  },
  requester_unlimited: {
    price: 7500,
    currency: "NGN",
    name: "Unlimited Hiring",
    label: "Unlimited Hiring",
    type: "requester_unlimited" as const,
    description: "Unlimited job postings, priority support, and ad-free experience.",
  },
  company_business: {
    price: 25000,
    currency: "NGN",
    name: "Business Plan",
    label: "Business Plan",
    type: "requester_unlimited" as const,
    description: "Essential hiring tools, up to 10 active jobs.",
  },
  company_professional: {
    price: 50000,
    currency: "NGN",
    name: "Professional Plan",
    label: "Professional Plan",
    type: "requester_unlimited" as const,
    description: "Full access including service rendering, unlimited jobs, and premium support.",
  },
} as const;

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
