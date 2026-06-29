/**
 * Minimal Field bridge listener for the field-inbox artifact.
 * Handles the harness handshake and listens for harness:notification-push commands.
 * No dependency on the full FieldPrototypeBridge SDK.
 */

export interface NotifyPayload {
  channel: "email" | "sms";
  template: string;
  to: { name: string; email?: string; phone?: string };
  data: Record<string, unknown>;
  from?: string;
}

export type NotifyHandler = (payload: NotifyPayload) => void;

function extractPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  // Canonical envelope: { protocol: "field-harness-protocol", payload: { type, ... } }
  if (msg.protocol === "field-harness-protocol" && msg.payload && typeof msg.payload === "object") {
    return msg.payload as Record<string, unknown>;
  }
  // Bare message (starts with harness:, prototype:, etc.)
  if (typeof msg.type === "string") return msg;
  return null;
}

export function initBridge(
  id: string,
  name: string,
  onNotify: NotifyHandler,
): () => void {
  const inIframe = window.parent !== window;

  if (!inIframe) {
    // Standalone — demo mode, inject a test notification after 1s
    setTimeout(() => {
      onNotify({
        channel: "email",
        template: "patient-invite",
        to: { name: "Rebecca Chen", email: "rebecca.chen@example.com" },
        data: {
          firstName: "Rebecca",
          clinicName: "T1D Endocrinology Clinic",
          device: "Omnipod 5",
          expiryDays: 14,
        },
      });
    }, 800);
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    const payload = extractPayload(event.data);
    if (!payload) return;
    const nonce = (event.data as Record<string, unknown>).nonce;

    if (payload.type === "harness:handshake-request") {
      window.parent.postMessage(
        {
          type: "prototype:handshake-response",
          manifest: { id, name, version: "1.0.0" },
        },
        "*",
      );
    }

    if (
      payload.type === "harness:command" &&
      payload.commandId === "harness:notification-push"
    ) {
      const params = (payload.params ?? {}) as NotifyPayload;
      onNotify(params);
      // Ack so Field knows the command landed
      window.parent.postMessage(
        {
          type: "prototype:command-ack",
          commandId: payload.commandId,
          status: "ok",
          nonce,
        },
        "*",
      );
    }
  };

  window.addEventListener("message", handler);
  // Announce ready — Field responds with harness:handshake-request
  window.parent.postMessage({ type: "prototype:ready", id, version: "1.0.0" }, "*");

  return () => window.removeEventListener("message", handler);
}
