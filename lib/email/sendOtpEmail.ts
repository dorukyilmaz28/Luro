import { Resend } from "resend";
import type { Locale } from "@/lib/i18n/locale";
import type { OtpPurpose } from "@/lib/auth/otp";

type Copy = { subject: string; heading: string; body: string; footer: string };

const COPY: Record<OtpPurpose, Record<Locale, Copy>> = {
  signup: {
    tr: {
      subject: "Luro doğrulama kodunuz",
      heading: "E-posta adresinizi doğrulayın",
      body: "Luro hesabınızı oluşturmak için aşağıdaki kodu girin. Kod 10 dakika geçerlidir.",
      footer: "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
    },
    en: {
      subject: "Your Luro verification code",
      heading: "Verify your email address",
      body: "Enter the code below to create your Luro account. It expires in 10 minutes.",
      footer: "If you didn't request this, you can safely ignore this email.",
    },
  },
  password_reset: {
    tr: {
      subject: "Luro şifre sıfırlama kodunuz",
      heading: "Şifrenizi sıfırlayın",
      body: "Şifrenizi sıfırlamak için aşağıdaki kodu girin. Kod 10 dakika geçerlidir.",
      footer: "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilir, şifreniz değişmez.",
    },
    en: {
      subject: "Your Luro password reset code",
      heading: "Reset your password",
      body: "Enter the code below to reset your password. It expires in 10 minutes.",
      footer: "If you didn't request this, you can safely ignore this email — your password stays unchanged.",
    },
  },
};

export async function sendOtpEmail(
  email: string,
  code: string,
  locale: Locale = "tr",
  purpose: OtpPurpose = "signup",
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new Error("RESEND_API_KEY environment variable is missing.");
  }

  const copy = COPY[purpose][locale];
  const resend = new Resend(resendKey);
  const from = process.env.CONTACT_FROM || "Luro <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.body}\n\n${code}\n\n${copy.footer}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto">
        <h2 style="color:#1c2733">${copy.heading}</h2>
        <p style="color:#64748a;line-height:1.6">${copy.body}</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.2em;color:#2f6fb0;text-align:center;margin:24px 0">${code}</p>
        <p style="color:#94a3b8;font-size:13px">${copy.footer}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
