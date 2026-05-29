"use client";

import { useEffect, useState, useCallback } from "react";

const FIRST_NAMES = [
  "David", "Sarah", "Michael", "Emma", "James", "Olivia", "Daniel", "Sophia",
  "William", "Isabella", "Alexander", "Mia", "Benjamin", "Charlotte", "Ethan",
  "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Sebastian", "Aria",
  "Jack", "Chloe", "Owen", "Luna", "Samuel", "Penelope", "Ryan", "Layla"
];

const LAST_NAMES = [
  "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
  "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin",
  "Lee", "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker"
];

interface Payout {
  id: number;
  name: string;
  amount: string;
  time: string;
  status: "Paid" | "Processing";
}

function generatePayout(id: number): Payout {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const amount = (Math.floor(Math.random() * 15000) + 200).toLocaleString();
  const minutes = Math.floor(Math.random() * 10) + 1;
  const statuses: ("Paid" | "Processing")[] = ["Paid", "Paid", "Paid", "Processing"];
  return {
    id,
    name: `${firstName} ${lastName}`,
    amount: `$${amount}`,
    time: `${minutes} min${minutes > 1 ? "s" : ""} ago`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  };
}

export default function RecentPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [nextId, setNextId] = useState(0);

  const addPayout = useCallback(() => {
    setNextId(prev => {
      const newPayout = generatePayout(prev);
      setPayouts(current => [newPayout, ...current].slice(0, 6));
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    const initial: Payout[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push(generatePayout(i));
    }
    setPayouts(initial);
    setNextId(5);

    const interval = setInterval(addPayout, 8000);
    return () => clearInterval(interval);
  }, [addPayout]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-white">Recent Payouts</h3>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payouts.map((payout) => (
              <tr key={payout.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-3 text-sm text-gray-300 whitespace-nowrap">{payout.name}</td>
                <td className="px-6 py-3 text-sm font-medium text-emerald-400 whitespace-nowrap">{payout.amount}</td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{payout.time}</td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payout.status === "Paid"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}
                  >
                    {payout.status}
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