"use client";

import { useEffect, useState, useCallback } from "react";

const FIRST_NAMES = [
  "Michael", "Sarah", "David", "Emma", "James", "Olivia", "Daniel", "Sophia",
  "William", "Isabella", "Alexander", "Mia", "Benjamin", "Charlotte", "Ethan",
  "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Sebastian", "Aria",
  "Jack", "Chloe", "Owen", "Luna", "Samuel", "Penelope", "Ryan", "Layla",
  "Nathan", "Riley", "Caleb", "Zoey", "Adrian", "Nora", "Thomas", "Lily",
  "Marcus", "Ella", "Christopher", "Victoria", "Andrew", "Grace", "Joshua"
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const ACTIONS = [
  { template: (n: string) => `${n} withdrew $AMOUNT`, min: 500, max: 15000, icon: "↗" },
  { template: (n: string) => `${n} received payout of $AMOUNT`, min: 200, max: 8000, icon: "↗" },
  { template: (n: string) => `${n} started a $AMOUNT investment`, min: 1000, max: 50000, icon: "↗" },
  { template: (n: string) => `${n} completed KYC verification`, min: 0, max: 0, icon: "✓" },
  { template: (n: string) => `${n} deposited $AMOUNT`, min: 500, max: 25000, icon: "↗" },
  { template: (n: string) => `${n} upgraded to Premium plan`, min: 0, max: 0, icon: "★" },
  { template: (n: string) => `${n} withdrew $AMOUNT in BTC`, min: 1000, max: 30000, icon: "₿" },
  { template: (n: string) => `${n} received $AMOUNT profit`, min: 300, max: 12000, icon: "↗" },
];

interface Activity {
  id: number;
  text: string;
  icon: string;
  timeAgo: string;
}

function randomAmount(min: number, max: number) {
  return (Math.floor(Math.random() * (max - min + 1)) + min).toLocaleString();
}

function generateActivity(id: number): Activity {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastInit = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const name = `${firstName} ${lastInit}.`;
  const text = action.template(name).replace("$AMOUNT", `$${randomAmount(action.min, action.max)}`);
  const timeAgo = `${Math.floor(Math.random() * 5) + 1}m ago`;
  return { id, text, icon: action.icon, timeAgo };
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nextId, setNextId] = useState(0);

  const addActivity = useCallback(() => {
    setNextId(prev => {
      const id = prev;
      const newActivity = generateActivity(id);
      setActivities(current => [newActivity, ...current].slice(0, 8));
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    // Initial activities
    const initial: Activity[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push(generateActivity(i));
    }
    setActivities(initial);
    setNextId(5);

    const interval = setInterval(addActivity, 4000);
    return () => clearInterval(interval);
  }, [addActivity]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-emerald-400">Live Activity</span>
      </div>
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 text-sm text-gray-300"
            style={{
              animation: "fadeSlideIn 0.4s ease-out",
              opacity: i === 0 ? 1 : 1,
            }}
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs">
              {activity.icon}
            </span>
            <span className="flex-1 truncate">{activity.text}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">{activity.timeAgo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}