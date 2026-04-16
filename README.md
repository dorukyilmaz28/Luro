# Luro

Endüstriyel sahalar için yapay zeka destekli güvenlik izleme platformu — pazarlama sitesi (Next.js App Router + Tailwind).

## Geliştirme

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## Vercel’e deploy

1. Repoyu GitHub’a bağlayıp Vercel’de import edin.
2. **Environment Variables** bölümüne (`.env` dosyaları repoya eklenmez) şunları ekleyin:

| Değişken | Açıklama |
|----------|----------|
| `RESEND_API_KEY` | İletişim formu e-postası (Resend) |
| `CONTACT_TO` | Form gönderimlerinin gideceği e-posta |
| `CONTACT_FROM` | Gönderen (örn. `Luro <onboarding@resend.dev>` veya doğrulanmış domain) |
| `GEMINI_API_KEY` | Sohbet asistanı (Google AI Studio / Gemini) |

Yerelde kopya için `.env.local` kullanın; bu dosya `.gitignore` ile dışlanır.

## Yapı

- `/` — Ana sayfa  
- `/cozum` — Ürün / çözüm detayı  
- `/demo` — Demo talep formu  
- `/api/contact` — Form → e-posta  
- `/api/gemini` — Asistan → Gemini  
