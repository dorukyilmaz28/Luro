import { Resend } from "resend";
import type { Locale } from "@/lib/i18n/locale";

type AlertCopy = {
  subject: string;
  heading: string;
  intro: (camera: string) => string;
  cta: string;
  footer: string;
};

const COPY: Record<Locale, AlertCopy> = {
  tr: {
    subject: "⚠️ Luro kritik güvenlik uyarısı",
    heading: "Kritik güvenlik ihlali tespit edildi",
    intro: (camera) => `${camera} kamerasında acil müdahale gerektiren bir durum algılandı:`,
    cta: "Panelde İncele",
    footer: "Bu uyarıyı Luro güvenlik izleme sisteminiz gönderdi.",
  },
  en: {
    subject: "⚠️ Luro critical safety alert",
    heading: "Critical safety violation detected",
    intro: (camera) => `A situation requiring immediate attention was detected on camera ${camera}:`,
    cta: "Review in dashboard",
    footer: "This alert was sent by your Luro safety monitoring system.",
  },
};

const EVENT_LABELS: Record<Locale, Record<string, string>> = {
  tr: {
    fire_smoke: "Yangın / Duman",
    person_fall_suspected: "Olası düşme",
    restricted_zone_entry: "Yasaklı bölge ihlali",
    unsafe_proximity: "Tehlikeli yakınlık",
  },
  en: {
    fire_smoke: "Fire / smoke",
    person_fall_suspected: "Possible fall",
    restricted_zone_entry: "Restricted zone entry",
    unsafe_proximity: "Unsafe proximity",
  },
};

export async function sendAlertEmail(
  email: string,
  cameraLabel: string,
  eventTypes: string[],
  locale: Locale = "tr",
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new Error("RESEND_API_KEY environment variable is missing.");
  }

  const copy = COPY[locale];
  const labels = EVENT_LABELS[locale];
  const items = eventTypes.map((type) => labels[type] ?? type);
  const dashboardUrl = (process.env.APP_URL || "https://www.luro-ai.com").replace(/\/$/, "") + "/dashboard/alerts";

  const resend = new Resend(resendKey);
  const from = process.env.CONTACT_FROM || "Luro <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.intro(cameraLabel)}\n\n- ${items.join("\n- ")}\n\n${dashboardUrl}\n\n${copy.footer}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:460px;margin:0 auto">
        <div style="border-left:4px solid #f43f5e;padding-left:14px;margin-bottom:16px">
          <h2 style="color:#1c2733;margin:0 0 6px">${copy.heading}</h2>
          <p style="color:#64748a;line-height:1.6;margin:0">${copy.intro(cameraLabel)}</p>
        </div>
        <ul style="color:#1c2733;font-size:15px;line-height:1.9;padding-left:18px;margin:0 0 20px">
          ${items.map((i) => `<li><strong>${i}</strong></li>`).join("")}
        </ul>
        <a href="${dashboardUrl}" style="display:inline-block;background:#2f6fb0;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600;font-size:14px">${copy.cta}</a>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px">${copy.footer}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send alert email: ${error.message}`);
  }
}
