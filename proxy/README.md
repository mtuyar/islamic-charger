# Ruhnevâz AI Proxy

Uygulamadaki "AI ile Derinlemesine Öğren" özelliği için küçük bir Vercel edge
fonksiyonu. Anthropic API anahtarı **sadece burada** durur; uygulamaya hiçbir
zaman gömülmez.

## Kurulum

```bash
cd proxy
vercel deploy --prod
vercel env add ANTHROPIC_API_KEY production   # anahtarı gir
vercel deploy --prod                           # env ile tekrar deploy
```

Deploy URL'sini uygulamaya tanıt (EAS build sırasında `app.config.js` okur):

```bash
cd ..
eas env:create --scope project --environment production \
  --name AI_PROXY_URL --value https://<deployment>.vercel.app/api/word-depth --visibility plaintext
```

Lokal geliştirme için `.env` dosyasına `AI_PROXY_URL=...` yazman yeterli.
`AI_PROXY_URL` boşsa uygulama AI bölümünü hiç göstermez; diğer her şey çalışır.

> İstersen bir rate-limit ekle (ör. Vercel WAF veya Upstash) — şu an uç nokta
> herkese açık, tek koruma istek başına 300 token limiti ve 30 günlük CDN cache.
