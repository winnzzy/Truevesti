"use client";

import { useEffect, useState, useCallback } from "react";

const FIRST_NAMES = [
  "James", "Olivia", "Daniel", "Sophia", "William", "Isabella", "Alexander", "Mia",
  "Benjamin", "Charlotte", "Ethan", "Amelia", "Lucas", "Harper", "Henry", "Evelyn",
  "Sebastian", "Aria", "Jack", "Chloe", "Owen", "Luna", "Samuel", "Penelope",
  "Ryan", "Layla", "Nathan", "Riley", "Caleb", "Zoey", "Adrian", "Nora"
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const MESSAGES = [
  (n: string, a: string) => `${n} withdrew $${a}`,
  (n: string, a: string) => `${n} received payout of $${a}`,
  (n: string, a: string) => `${n} completed withdrawal of $${a}`,
  (n: string, a: string) => `${n} earned $${a} in returns`,
];

interface TickerNotification {
  id: number;
  message: string;
  visible: boolean;
}

let tickerId = 0;

export default function WithdrawalTicker() {
  const [notification, setNotification] = useState<TickerNotification | null>(null);

  const showNotification = useCallback(() => {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastInit = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
    const amount = (Math.floor(Math.random() * 12000) + 500).toLocaleString();
    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)](
      `${firstName} ${lastInit}.`,
      amount
    );
    const id = ++tickerId;
    setNotification({ id, message: msg, visible: true });

    setTimeout(() => {
      setNotification(prev => (prev?.id === id ? { ...prev, visible: false } : prev));
    }, 6000);

    setTimeout(() => {
      setNotification(prev => (prev?.id === id ? null : prev));
    }, 7000);
  }, []);

  useEffect(() => {
    const delay = setTimeout(showNotification, 3000);
    const interval = setInterval(showNotification, 18000 + Math.random() * 12000);
    return () => {
      clearTimeout(delay);
      clearInterval(interval);
    };
  }, [showNotification]);

  if (!notification) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-50 max-w-sm pointer-events-none"
      style={{
        animation: notification.visible
          ? "slideInLeft 0.5s ease-out forwards"
          : "slideOutLeft 0.5s ease-in forwards",
      }}
    >
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-emerald-500/30 bg-gray-900/90 backdrop-blur-xl shadow-2xl shadow-emerald-500/10">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-medium text-white">{notification.message}</p>
          <p className="text-xs text-emerald-400">Just now</p>
        </div>
      </div>
    </div>
  );
}