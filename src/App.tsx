import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { initBridge, type NotifyPayload } from "./bridge";
import { bindLocale, type BindLocaleOptions } from "./i18n/bindLocale";
import i18n, { SUPPORTED_LOCALES } from "./i18n/config";

/* ── Message model ─────────────────────────────────────────────────────────── */

interface EmailMessage {
  id: string;
  ts: number;
  unread: boolean;
  from: string;
  fromAddr: string;
  to: string;
  toAddr: string;
  subjectKey: string;
  subjectVars: Record<string, unknown>;
  previewKey: string;
  previewVars: Record<string, unknown>;
  templateKey: string;
  templateVars: Record<string, unknown>;
}

const PURPLE = "#6b21a8";
const LIGHT_PURPLE = "#f3e8ff";

function buildMessage(payload: NotifyPayload): Omit<EmailMessage, "id" | "ts" | "unread"> {
  const d = payload.data;
  const firstName = String(d.firstName ?? payload.to.name.split(" ")[0] ?? "");
  const clinicName = String(d.clinicName ?? "your clinic");
  const role = String(d.role ?? "provider");
  const device = String(d.device ?? "Omnipod");
  const expiryDays = Number(d.expiryDays ?? 14);
  const from = payload.from ?? "noreply@insulet.com";

  const base = {
    from: "Omnipod Discover",
    fromAddr: from,
    to: payload.to.name,
    toAddr: payload.to.email ?? "",
    templateKey: payload.template,
    templateVars: { firstName, clinicName, role, device, expiryDays },
  };

  const subjectVars =
    payload.template === "staff-invite" ? { clinicName } : {};

  return {
    ...base,
    subjectKey: `template.${payload.template}.subject`,
    subjectVars,
    previewKey: `template.${payload.template}.preview`,
    previewVars: { firstName, clinicName, role },
  };
}

/* ── Date helpers ──────────────────────────────────────────────────────────── */

function formatTs(ts: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  const diffMins = Math.floor((Date.now() - ts) / 60000);
  if (diffMins < 1) return t("inbox.justNow");
  if (diffMins < 60) return t("inbox.minutesAgo", { count: diffMins });
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullTs(ts: number): string {
  return new Date(ts).toLocaleString([], {
    weekday: "long", month: "long", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ── Avatar ────────────────────────────────────────────────────────────────── */

function SenderAvatar() {
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: PURPLE,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <ellipse cx="11" cy="11" rx="6" ry="6" stroke="white" strokeWidth="2.2" fill="none" />
        <circle cx="11" cy="11" r="2" fill="white" />
      </svg>
    </div>
  );
}

/* ── Inbox row ─────────────────────────────────────────────────────────────── */

function InboxRow({ msg, onClick }: { msg: EmailMessage; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} style={{ display: "flex", gap: 12, padding: "14px 20px",
      width: "100%", background: msg.unread ? "#fff" : "#f9f9f9", border: "none",
      borderBottom: "1px solid #e5e7eb", textAlign: "left", cursor: "pointer", alignItems: "flex-start" }}>
      <SenderAvatar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
          gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: msg.unread ? 600 : 400, fontSize: 14, color: "#111",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {msg.from}
          </span>
          <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
            {formatTs(msg.ts, t)}
          </span>
        </div>
        <div style={{ fontWeight: msg.unread ? 600 : 400, fontSize: 13, color: "#1f2937",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
          {t(msg.subjectKey, msg.subjectVars)}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t(msg.previewKey, msg.previewVars)}
        </div>
      </div>
      {msg.unread && (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb",
          flexShrink: 0, marginTop: 6 }} />
      )}
    </button>
  );
}

/* ── Template body renderer ────────────────────────────────────────────────── */

function TemplateBody({ templateKey, vars }: {
  templateKey: string;
  vars: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const ns = `template.${templateKey}`;
  const hasCta = !!t(`${ns}.cta`, vars);
  const hasP2 = !!t(`${ns}.body_p2`, vars);
  const hasP3 = !!t(`${ns}.body_p3`, vars);

  return (
    <div style={{ fontSize: 15, lineHeight: 1.7, color: "#1f2937" }}>
      <p dangerouslySetInnerHTML={{ __html: t(`${ns}.body_p1`, vars) }} />
      {hasP2 && <p style={{ marginTop: 12 }} dangerouslySetInnerHTML={{ __html: t(`${ns}.body_p2`, vars) }} />}
      {hasCta && (
        <div style={{ margin: "24px 0" }}>
          <a href="#" style={{ background: PURPLE, color: "#fff", padding: "12px 24px",
            borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
            {t(`${ns}.cta`, vars)}
          </a>
        </div>
      )}
      {hasP3 && <p style={{ marginTop: hasCta ? 0 : 12 }} dangerouslySetInnerHTML={{ __html: t(`${ns}.body_p3`, vars) }} />}
    </div>
  );
}

/* ── Detail view ───────────────────────────────────────────────────────────── */

function DetailView({ msg, onBack }: { msg: EmailMessage; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer",
          color: "#2563eb", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center",
          gap: 4, padding: "4px 0", fontFamily: "inherit" }}>
          {t("inbox.backToInbox")}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#f4f4f4", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111", margin: "0 0 16px", lineHeight: 1.3 }}>
              {t(msg.subjectKey, msg.subjectVars)}
            </h2>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <SenderAvatar />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#111" }}>{msg.from}</span>
                  <span style={{ color: "#6b7280" }}> &lt;{msg.fromAddr}&gt;</span>
                </div>
                <div style={{ color: "#6b7280" }}>
                  To: {msg.to}{msg.toAddr ? ` <${msg.toAddr}>` : ""}
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                  {formatFullTs(msg.ts)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "24px 24px 32px" }}>
            <div style={{ background: LIGHT_PURPLE, borderRadius: 6, padding: "12px 18px",
              marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: PURPLE,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <ellipse cx="11" cy="11" rx="6" ry="6" stroke="white" strokeWidth="2.2" fill="none" />
                  <circle cx="11" cy="11" r="2" fill="white" />
                </svg>
              </div>
              <span style={{ fontWeight: 600, color: PURPLE, fontSize: 14 }}>Omnipod Discover™</span>
            </div>
            <TemplateBody templateKey={msg.templateKey} vars={msg.templateVars} />
            <hr style={{ margin: "28px 0 20px", border: "none", borderTop: "1px solid #e5e7eb" }} />
            <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
              {t("inbox.footer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────────── */

function EmptyInbox() {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1, gap: 12, padding: 32 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="10" width="40" height="30" rx="4" stroke="#d1d5db" strokeWidth="2" fill="none" />
        <path d="M4 16l20 14 20-14" stroke="#d1d5db" strokeWidth="2" />
      </svg>
      <p style={{ fontSize: 15, fontWeight: 500, color: "#6b7280", textAlign: "center" }}>
        {t("inbox.noMessages")}
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", maxWidth: 220 }}>
        {t("inbox.noMessagesDetail")}
      </p>
    </div>
  );
}

/* ── Root app ──────────────────────────────────────────────────────────────── */

let msgCounter = 0;

export default function App() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const bridgeInit = useRef(false);

  useEffect(() => {
    if (bridgeInit.current) return;
    bridgeInit.current = true;

    const localeBindLocaleOptions: BindLocaleOptions = {
      supportedLocales: SUPPORTED_LOCALES.map((l) => l.code),
      apply: (code) => {
        // Map BCP-47 code to i18next language tag (e.g. "en-US" → "en")
        const lang = code.split("-")[0];
        i18n.changeLanguage(lang);
      },
    };

    const cleanup = initBridge("field-inbox", "Email Inbox", {
      ...bindLocale(localeBindLocaleOptions),
      "harness:notification-push": (params) => {
        const payload = params as NotifyPayload;
        const msg: EmailMessage = {
          id: String(++msgCounter),
          ts: Date.now(),
          unread: true,
          ...buildMessage(payload),
        };
        setMessages((prev) => [msg, ...prev]);
        setSelected(msg);
      },
    });

    return cleanup;
  }, []);

  const handleSelect = (msg: EmailMessage) => {
    setSelected(msg);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, unread: false } : m)));
  };

  const unreadCount = messages.filter((m) => m.unread).length;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      background: "#f4f4f4", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "0 20px", height: 52, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="10" width="40" height="30" rx="4" stroke={PURPLE} strokeWidth="3" fill="none" />
            <path d="M4 16l20 14 20-14" stroke={PURPLE} strokeWidth="3" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>{t("inbox.title")}</span>
          {unreadCount > 0 && (
            <span style={{ background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700,
              borderRadius: 10, padding: "1px 6px", lineHeight: 1.6 }}>
              {unreadCount}
            </span>
          )}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selected ? (
          <DetailView msg={selected} onBack={() => setSelected(null)} />
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
