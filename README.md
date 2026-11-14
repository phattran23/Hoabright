# HoaBright University website

Full website for HoaBright University, running on **Cloudflare Workers** with a **D1** database.

- **Frontend** – pages are rendered on the server by the Worker (fast first load, good for SEO, works without JavaScript). Styles and scripts live in `public/`.
- **Backend** – a small API in the same Worker: contact form, search, and a password-protected admin API.
- **Admin** – `/admin` lets you edit all page text, programmes, events and news posts, and read contact-form submissions.

## Pages

| Address | What it shows |
| --- | --- |
| `/` | Home page |
| `/hoc-thuat`, `/hoc-thuat/<slug>` | Programmes list and programme detail |
| `/tin-tuc`, `/tin-tuc/<slug>` | News list and article |
| `/su-kien` | Upcoming and past events |
| `/lien-he` | Contact form |
| `/tim-kiem?q=` | Search |
| `/quyen-rieng-tu` | Privacy policy |
| `/admin` | Admin area |

## Project layout

```
public/            static files (css, js, images, admin page)
src/index.js       router + security headers
src/pages.js       page templates
src/layout.js      shared header / footer
src/api.js         contact form, search, admin API
migrations/        database schema + starting content
wrangler.jsonc     Cloudflare configuration
```

## Run on your computer

Requires Node.js 20 or newer.

```bash
npm install
```

Copy `.dev.vars.example` to `.dev.vars` and set your own local admin password in it, then:

```bash
npm run db:local
```

```bash
npm run dev
```

Open http://localhost:8787 (admin at http://localhost:8787/admin).

## Publish

### 1. Push to GitHub

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "HoaBright University website"
```

Create an empty repository on GitHub, then run the two `git remote add origin …` / `git push -u origin main` commands GitHub shows you.

### 2. Create the database on Cloudflare

```bash
npx wrangler login
```

```bash
npx wrangler d1 create hoabright-db
```

Copy the `database_id` it prints into `wrangler.jsonc` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`), then commit and push that change.

### 3. First deploy

```bash
npm run deploy
```

This creates the tables with their starting content and publishes the site. The command prints the site address (`https://hoabright-university.<your-account>.workers.dev`).

### 4. Set the admin password

```bash
npx wrangler secret put ADMIN_TOKEN
```

Type a long password when asked. This is the password for `/admin`. Until it is set, the admin area refuses all logins.

### 5. Deploy automatically from GitHub (optional)

In the Cloudflare dashboard: **Workers & Pages → hoabright-university → Settings → Builds → Connect** and pick the GitHub repository. Keep the default deploy command (`npx wrangler deploy`). Every push to `main` then publishes the site.

If you later add a new file in `migrations/`, run `npm run db:remote` once to apply it.

### 6. Your own domain (optional)

**Workers & Pages → hoabright-university → Settings → Domains & Routes → Add → Custom domain.**

## Filling in the content

Text in `[square brackets]` is a placeholder. Sign in at `/admin` and replace it:

- **Nội dung trang** – hero title, quote, statistics, testimonial, accreditation, partners, contact details, privacy policy.
- **Ngành học / Sự kiện / Bài viết** – add, edit, delete.
- **Liên hệ** – submissions from the contact form.

Public pages are cached for one minute, so edits appear shortly after saving.

To replace the illustrations, put your own images in `public/img/` using the same file names, or point a post's image field at any image address.
