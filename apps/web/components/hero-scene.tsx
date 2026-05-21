"use client";

import { useState } from "react";

const rails = [
  { label: "KYC", value: "98.4%", top: "18%", left: "9%" },
  { label: "Treasury", value: "$42.8M", top: "35%", left: "72%" },
  { label: "Wallets", value: "Live", top: "68%", left: "15%" },
  { label: "Risk", value: "Active", top: "76%", left: "66%" }
];

export function HeroScene() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  return (
    <div
      className="hero-scene"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTilt({
          x: ((event.clientY - rect.top) / rect.height - 0.5) * -12,
          y: ((event.clientX - rect.left) / rect.width - 0.5) * 14
        });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="hero-grid" />
      <div className="signal signal-a" />
      <div className="signal signal-b" />
      <div className="signal signal-c" />
      <div
        className="vault"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="vault-face vault-top" />
        <div className="vault-face vault-left" />
        <div className="vault-face vault-right" />
        <div className="vault-core">
          <div className="vault-ring" />
          <div className="vault-ring vault-ring-two" />
          <div className="vault-chip">
            <span>TV</span>
          </div>
        </div>
      </div>
      {rails.map((rail, index) => (
        <div
          className="floating-rail"
          key={rail.label}
          style={{ animationDelay: `${index * 0.35}s`, left: rail.left, top: rail.top }}
        >
          <span>{rail.label}</span>
          <strong>{rail.value}</strong>
        </div>
      ))}
      <div className="ticker-track">
        {["USDC verified", "Maturity queue", "Deposit monitor", "Audit trail", "Admin controls"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
