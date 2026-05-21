"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/card";
import { apiRequest, readSession, type AuthSession } from "@/lib/api";

type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
};

export function ContactClient() {
  const [session] = useState<AuthSession | null>(() => readSession());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(session));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const headers = useMemo(() => session ? { Authorization: `Bearer ${session.accessToken}` } : undefined, [session]);

  const loadTickets = useCallback(async () => {
    if (!headers) return;

    try {
      const response = await apiRequest<{ tickets: SupportTicket[] }>("/support/tickets", { headers });
      setTickets(response.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headers) {
      setError("Sign in from the access page to create a support ticket.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    setError("");

    try {
      const response = await apiRequest<{ ticket: SupportTicket }>("/support/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify({ subject, message, priority })
      });
      setTickets((current) => [response.ticket, ...current]);
      setSubject("");
      setMessage("");
      setPriority("NORMAL");
      setStatus("Ticket created. Operations will review it from the support queue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) {
    return <Card className="text-slate-300">Sign in from the access page to create and review support tickets.</Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm text-slate-300">
            Subject
            <input
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
              maxLength={160}
              onChange={(event) => setSubject(event.target.value)}
              required
              value={subject}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Priority
            <select
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-ink px-4 py-3 text-white"
              onChange={(event) => setPriority(event.target.value)}
              value={priority}
            >
              {["LOW", "NORMAL", "HIGH", "URGENT"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-300">
            Message
            <textarea
              className="focus-ring mt-2 min-h-40 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
              maxLength={4000}
              minLength={10}
              onChange={(event) => setMessage(event.target.value)}
              required
              value={message}
            />
          </label>
          <button className="focus-ring rounded-md bg-mint px-5 py-3 font-semibold text-ink" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create ticket"}
          </button>
          {status ? <p className="rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
          {error ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        </form>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold text-white">Recent tickets</h2>
        <div className="mt-4 divide-y divide-white/10">
          {isLoading ? <p className="py-4 text-sm text-slate-300">Loading tickets...</p> : null}
          {!isLoading && tickets.length === 0 ? <p className="py-4 text-sm text-slate-300">No tickets yet.</p> : null}
          {tickets.slice(0, 5).map((ticket) => (
            <div className="py-4" key={ticket.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">{ticket.subject}</p>
                <p className="text-xs font-semibold text-mint">{ticket.status} - {ticket.priority}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-300">{ticket.message}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
