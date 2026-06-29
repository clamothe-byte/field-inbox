import { useState, useEffect, useRef } from "react";
import { initBridge, type NotifyPayload } from "./bridge";

/* ── Template rendering ────────────────────────────────────────────────────── */

interface EmailMessage {
  id: string;
  ts: number;
  unread: boolean;
  from: string;
  fromAddr: string;
  to: string;
  toAddr: string;
  subject: string;
  preview: string;
  body: string;
}

const PURPLE = "#6b21a8";
const LIGHT_PURPLE = "#f3e8ff";

function renderTemplate(payload: NotifyPayload): Omit<EmailMessage, "id" | "ts" | "unread"> {
  const d = payload.data;
  const firstName = String(d.firstName ?? payload.to.name.split(" ")[0] ?? "");
  const clinicName = String(d.clinicName ?? "your clinic");
  const role = String(d.role ?? "provider");
  const device = String(d.device ?? "Omnipod");
  const expiryDays = Number(d.expiryDays ?? 14);
  const from = payload.from ?? "noreply@insulet.com";
  const toAddr = payload.to.email ?? "";
  const toName = payload.to.name;

  switch (payload.template) {
    case "patient-invite":
      return {
        from: "Omnipod Discover",
        fromAddr: from,
        to: toName,
        toAddr,
        subject: "Your invitation to join Omnipod Discover",
        preview: `Hi ${firstName}, you've been invited by ${clinicName}…`,
        body: `<p>Hi ${firstName},</p>
<p>You've been invited by <strong>${clinicName}</strong> to join <strong>Omnipod Discover™</strong>, a secure platform that lets your care team monitor your ${device} therapy data.</p>
<p>Your invitation expires in <strong>${expiryDays} days</strong>.</p>
<div style="margin:24px 0">
  <a href="#" style="background:${PURPLE};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">Accept Invitation</a>
</div>
<p>If you have questions, contact your care team or call Insulet Customer Care at 1-800-591-3455.</p>`,
      };

    case "staff-invite":
      return {
        from: "Omnipod Discover",
        fromAddr: from,
        to: toName,
        toAddr,
        subject: `You've been added to ${clinicName} on Omnipod Discover`,
        preview: `Hi ${firstName}, you now have ${role} access…`,
        body: `<p>Hi ${firstName},</p>
<p>An administrator at <strong>${clinicName}</strong> has added you to <strong>Omnipod Discover™</strong> as a <strong>${role}</strong>.</p>
<div style="margin:24px 0">
  <a href="#" style="background:${PURPLE};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">Sign In to Omnipod Discover</a>
</div>
<p>If you believe this was sent in error, you can safely ignore this email.</p>`,
      };

    case "staff-approval":
      return {
        from: "Omnipod Discover",
        fromAddr: from,
        to: toName,
        toAddr,
        subject: "Your Omnipod Discover access has been approved",
        preview: `Hi ${firstName}, your access request for ${clinicName} was approved…`,
        body: `<p>Hi ${firstName},</p>
<p>Your request to join <strong>${clinicName}</strong> on <strong>Omnipod Discover™</strong> has been approved. You now have access as a <strong>${role}</strong>.</p>
<div style="margin:24px 0">
  <a href="#" style="background:${PURPLE};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">Sign In Now</a>
</div>`,
      };

    case "staff-rejection":
      return {
        from: "Omnipod Discover",
        fromAddr: from,
        to: toName,
        toAddr,
        subject: "Update on your Omnipod Discover access request",
        preview: `Hi ${firstName}, we wanted to follow up on your recent access request…`,
        body: `<p>Hi ${firstName},</p>
<p>We wanted to let you know that your request to access <strong>Omnipod Discover™</strong> has not been approved at this time.</p>
<p>If you believe this was an error, please contact your clinic administrator for assistance.</p>`,
      };

    case "forgot-password":
      return {
        from: "Omnipod Discover",
        fromAddr: from,
        to: toName,
        toAddr,
        subject: "Reset your Omnipod Discover password",
        preview: `Hi ${firstName}, we received a request to reset your password…`,
        body: `<p>Hi ${firstName},</p>
<p>We received a request to reset the password for your <strong>Omnipod Discover™</strong> account.</p>
<div style="margin:24px 0">
  <a href="#" style="background:${PURPLE};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
</div>
<p>This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email — your account remains secure.</p>`,
      };

    default:
      return {
        from: "Omnipod Discover",
        fromAddr: from,
        to: toName,
        toAddr,
        subject: "Message from Omnipod Discover",
        preview: "You have a new message.",
        body: "<p>You have a new message from Omnipod Discover.</p>",
      };
  }
}

/* ── Date formatting ───────────────────────────────────────────────────────── */

function formatTs(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullTs(ts: number): string {
  return new Date(ts).toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Avatar ────────────────────────────────────────────────────────────────── */

function SenderAvatar() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: PURPLE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" fill="none" />
        {/* Simplified O mark */}
        <ellipse cx="11" cy="11" rx="6" ry="6" stroke="white" strokeWidth="2.2" fill="none" />
        <circle cx="11" cy="11" r="2" fill="white" />
      </svg>
    </div>
  );
}

/* ── Inbox list row ────────────────────────────────────────────────────────── */

function InboxRow({
  msg,
  onClick,
}: {
  msg: EmailMessage;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 20px",
        width: "100%",
        background: msg.unread ? "#fff" : "#f9f9f9",
        border: "none",
        borderBottom: "1px solid #e5e7eb",
        textAlign: "left",
        cursor: "pointer",
        alignItems: "flex-start",
      }}
    >
      <SenderAvatar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontWeight: msg.unread ? 600 : 400,
              fontSize: 14,
              color: "#111",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {msg.from}
          </span>
          <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
            {formatTs(msg.ts)}
          </span>
        </div>
        <div
          style={{
            fontWeight: msg.unread ? 600 : 400,
            fontSize: 13,
            color: "#1f2937",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 3,
          }}
        >
          {msg.subject}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {msg.preview}
        </div>
      </div>
      {msg.unread && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#2563eb",
            flexShrink: 0,
            marginTop: 6,
          }}
        />
      )}
    </button>
  );
}

/* ── Detail view ───────────────────────────────────────────────────────────── */

function DetailView({
  msg,
  onBack,
}: {
  msg: EmailMessage;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#2563eb",
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 0",
            fontFamily: "inherit",
          }}
        >
          ← Inbox
        </button>
      </div>

      {/* Email chrome */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f4f4f4", padding: 16 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Email header bar */}
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e5e7eb" }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#111",
                margin: "0 0 16px",
                lineHeight: 1.3,
              }}
            >
              {msg.subject}
            </h2>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <SenderAvatar />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#111" }}>{msg.from}</span>
                  <span style={{ color: "#6b7280" }}> &lt;{msg.fromAddr}&gt;</span>
                </div>
                <div style={{ color: "#6b7280" }}>
                  To: {msg.to}
                  {msg.toAddr ? ` <${msg.toAddr}>` : ""}
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                  {formatFullTs(msg.ts)}
                </div>
              </div>
            </div>
          </div>

          {/* Email body */}
          <div
            style={{
              padding: "24px 24px 32px",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#1f2937",
            }}
          >
            {/* Omnipod logo strip */}
            <div
              style={{
                background: LIGHT_PURPLE,
                borderRadius: 6,
                padding: "12px 18px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: PURPLE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <ellipse cx="11" cy="11" rx="6" ry="6" stroke="white" strokeWidth="2.2" fill="none" />
                  <circle cx="11" cy="11" r="2" fill="white" />
                </svg>
              </div>
              <span style={{ fontWeight: 600, color: PURPLE, fontSize: 14 }}>
                Omnipod Discover™
              </span>
            </div>

            <div dangerouslySetInnerHTML={{ __html: msg.body }} />

            <hr style={{ margin: "28px 0 20px", border: "none", borderTop: "1px solid #e5e7eb" }} />
            <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
              You received this email because you have an account or pending invitation with Omnipod
              Discover™. © Insulet Corporation. 100 Nagog Park, Acton, MA 01720 USA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────────── */

function EmptyInbox() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        color: "#9ca3af",
        gap: 12,
        padding: 32,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="10" width="40" height="30" rx="4" stroke="#d1d5db" strokeWidth="2" fill="none" />
        <path d="M4 16l20 14 20-14" stroke="#d1d5db" strokeWidth="2" />
      </svg>
      <p style={{ fontSize: 15, fontWeight: 500, color: "#6b7280", textAlign: "center" }}>
        No messages yet
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", maxWidth: 220 }}>
        Messages will appear here when a product triggers a notification via the Field bridge.
      </p>
    </div>
  );
}

/* ── Root app ──────────────────────────────────────────────────────────────── */

let msgCounter = 0;

export default function App() {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const bridgeInit = useRef(false);

  useEffect(() => {
    if (bridgeInit.current) return;
    bridgeInit.current = true;

    const cleanup = initBridge("field-inbox", "Email Inbox", (payload) => {
      const rendered = renderTemplate(payload);
      const msg: EmailMessage = {
        id: String(++msgCounter),
        ts: Date.now(),
        unread: true,
        ...rendered,
      };
      setMessages((prev) => [msg, ...prev]);
      setSelected(msg);
    });

    return cleanup;
  }, []);

  const handleSelect = (msg: EmailMessage) => {
    setSelected(msg);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, unread: false } : m)),
    );
  };

  const handleBack = () => {
    setSelected(null);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
        background: "#f4f4f4",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 20px",
          height: 52,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="10" width="40" height="30" rx="4" stroke={PURPLE} strokeWidth="3" fill="none" />
            <path d="M4 16l20 14 20-14" stroke={PURPLE} strokeWidth="3" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>Inbox</span>
          {messages.filter((m) => m.unread).length > 0 && (
            <span
              style={{
                background: "#2563eb",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 10,
                padding: "1px 6px",
                lineHeight: 1.6,
              }}
            >
              {messages.filter((m) => m.unread).length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selected ? (
          <DetailView msg={selected} onBack={handleBack} />
        ) : messages.length === 0 ? (
          <EmptyInbox />
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {messages.map((msg) => (
              <InboxRow key={msg.id} msg={msg} onClick={() => handleSelect(msg)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
