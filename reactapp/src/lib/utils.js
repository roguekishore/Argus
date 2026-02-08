import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Mask phone number for privacy
 * Shows only last 4 digits: 9876543210 -> ******3210
 */
export function maskPhoneNumber(phone) {
  if (!phone || phone.length < 4) return '****';
  return '******' + phone.slice(-4);
}
