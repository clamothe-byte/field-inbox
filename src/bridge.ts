/**
 * Minimal Field bridge listener for the field-inbox artifact.
 * Implements the harness handshake and dispatches harness:command payloads
 * to a caller-supplied command map (same pattern as FieldPrototypeBridge.init).
 */

export interface NotifyPayload {
  channel: "email" | "sms";
  template: string;
  to: { name: string; email?: string; phone?: string };
  data: Record<string, unknown>;
  from?: string;
}

export type CommandMap = Record<string, (params: unknown) => void>;

function extractPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.protocol === "field-harness-protocol" && msg.payload && typeof msg.payload === "object") {
    return msg.payload as Record<string, unknown>;
  }
  if (typeof msg.type === "string") return msg;
  return null;
}

export function initBridge(
  id: string,
  name: string,
  commands: CommandMap,
): () => void {
  const inIframe = window.parent !== window;

  if (!inIframe) {
    const notifyCmd = commands["harness:notification-push"];
    if (notifyCmd) {
      // If opened with ?payload=<base64json> (from standalone sendNotify fallback), use that.
      // Otherwise fall back to the built-in demo patient-invite.
      const raw = new URLSearchParams(window.location.search).get("payload");
      let payload: unknown = null;
      if (raw) {
        try {
          payload = JSON.parse(atob(raw));
        } catch {
          // malformed — fall through to demo
        }
      }
      setTimeout(() => {
        notifyCmd(
          payload ?? {
            channel: "email",
            template: "patient-invite",
            to: { name: "Rebecca Chen", email: "rebecca.chen@example.com" },
            data: {
              firstName: "Rebecca",
              clinicName: "T1D Endocrinology Clinic",
              device: "Omnipod 5",
              expiryDays: 14,
            },
          },
        );
      }, 80);
    }
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    const payload = extractPayload(event.data);
    if (!payload) return;
    const nonce = (event.data as Record<string, unknown>).nonce;

    if (payload.type === "harness:handshake-request") {
      window.parent.postMessage(
        { type: "prototype:handshake-response", manifest: { id, name, version: "1.0.0" } },
        "*",
      );
    }

    if (payload.type === "harness:command") {
      const commandId = String(payload.commandId ?? "");
      const params = payload.params;
      const handler = commands[commandId];
      if (handler) {
        try { handler(params); } catch (e) { console.error("[field-inbox bridge] command error:", commandId, e); }
      }
      window.parent.postMessage(
        { type: "prototype:command-ack", commandId, status: "ok", nonce },
        "*",
      );
    }
  };

  window.addEventListener("message", handler);
  window.parent.postMessage({ type: "prototype:ready", id, version: "1.0.0" }, "*");

  return () => window.removeEventListener("message", handler);
}
