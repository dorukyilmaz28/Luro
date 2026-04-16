import { Resend } from "resend";
import { NextResponse } from "next/server";

const resendKey = process.env.RESEND_API_KEY;

type Body = {
  adSoyad?: string;
  sirket?: string;
  email?: string;
  telefon?: string;
  mesaj?: string;
};

export async function POST(request: Request) {
  if (!resendKey) {
    return NextResponse.json(
      {
        error:
          "E-posta gönderimi yapılandırılmamış. RESEND_API_KEY ortam değişkenini ekleyin.",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const adSoyad = String(body.adSoyad || "").trim();
  const sirket = String(body.sirket || "").trim();
  const email = String(body.email || "").trim();
  const telefon = String(body.telefon || "").trim();
  const mesaj = String(body.mesaj || "").trim();

  if (!adSoyad || !sirket || !email || !mesaj) {
    return NextResponse.json({ error: "Zorunlu alanlar eksik." }, { status: 400 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });
  }

  const to = process.env.CONTACT_TO || "hello@luro-ai.com";
  const from =
    process.env.CONTACT_FROM || "Luro <onboarding@resend.dev>";

  const text = [
    `Yeni demo / iletişim talebi`,
    ``,
    `Ad Soyad: ${adSoyad}`,
    `Şirket: ${sirket}`,
    `E-posta: ${email}`,
    `Telefon: ${telefon || "—"}`,
    ``,
    `Mesaj:`,
    mesaj,
  ].join("\n");

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Luro demo talebi — ${sirket}`,
    text,
  });

  if (error) {
    return NextResponse.json(
      { error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
