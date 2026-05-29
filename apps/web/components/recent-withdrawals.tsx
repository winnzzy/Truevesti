"use client";

import { useEffect, useState, useCallback } from "react";

const FIRST_NAMES = [
  "Sarah", "David", "Michael", "Emma", "James", "Olivia", "Daniel", "Sophia",
  "William", "Isabella", "Alexander", "Mia", "Benjamin", "Charlotte", "Ethan",
  "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Sebastian", "Aria",
  "Jack", "Chloe", "Owen", "Luna", "Samuel", "Penelope", "Ryan", "Layla"
];

const LAST_NAMES = [
  "Williams", "Johnson", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
  "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin",
  "Lee", "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker"
];

const ASSETS = ["USDT", "BTC", "ETH", "USDC", "BNB", "SOL"];

interface Withdrawal {
  id: number;
  name: string;
  asset: string;
  amount: string;
  status: "Completed" | "Processing";
}

function generateWithdrawal(id: number): Withdrawal {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const amount = (Math.floor(Math.random() * 20000) + 500).toLocaleString();
  const statuses: ("Completed" | "Processing")[] = ["Completed", "Completed", "Completed", "Processing"];
  return {
    id,
    name: `${firstName} ${lastName}`,
    asset,
    amount: `$${amount}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  };
}

export default function RecentWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [nextId, setNextId] = useState(0);

  const addWithdrawal = useCallback(() => {
    setNextId(prev => {
      const newW = generateWithdrawal(prev);
      setWithdrawals(current => [newW, ...current].slice(0, 6));
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    const initial: Withdrawal[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push(generateWithdrawal(i));
    }
    setWithdrawals(initial);
    setNextId(5);

    const interval = setInterval(addWithdrawal, 10000);
    return () => clearInterval(interval);
  }, [addWithdrawal]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-white">Recent Withdrawals</h3>
          <span className="flex items-center gap-1.5 text-xs text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            Live
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-white/5">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {withdrawals.map((w) => (
              <tr key={w.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-3 text-sm text-gray-300 whitespace-nowrap">{w.name}</td>
                <td className="px-6 py-3 text-sm whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-gray-300 border border-white/10">
                    {w.asset}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-medium text-cyan-400 whitespace-nowrap">{w.amount}</td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      w.status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}
                  >
                    {w.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}