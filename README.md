# Script Key System

Next.js 15 + Tailwind v4 + shadcn/ui + Supabase

ระบบ generate key ให้ผู้ใช้หลังจากดูโฆษณาจาก ad server อื่น ผ่าน postback/callback
Key ใช้งานได้ 24 ชั่วโมง

## Features

- Landing page รับ key — ผู้ใช้จะได้ session id ที่ไม่ต้องล็อกอิน
- ปุ่มเปิดหน้าโฆษณาในแท็บใหม่ (URL มาจาก `NEXT_PUBLIC_AD_URL`)
- Ad server เรียก postback กลับมา → mark `ad_completed = true`
- UI จะรีเฟรชสถานะอัตโนมัติเมื่อกลับมาที่ tab
- ปุ่ม Generate Key → สร้าง key 24 ชั่วโมง (รวม countdown สด)
- หน้า `/verify` สำหรับตรวจสอบ key
- API `/api/key/verify?key=XXX` ใช้งานจาก script/bot ภายนอกได้

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. สร้างโปรเจกต์ใน [supabase.com](https://supabase.com)
2. เปิด SQL editor แล้วรัน [supabase/schema.sql](supabase/schema.sql)
3. คัดลอก URL / anon key / service role key จาก Project Settings → API

### 3. Env

คัดลอก `.env.example` → `.env.local` แล้วเติมค่า:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AD_POSTBACK_SECRET=<random 64 hex>
LINKVERTISE_USER_ID=<your-linkvertise-publisher-id>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

สร้าง `AD_POSTBACK_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

หา `LINKVERTISE_USER_ID` ได้จาก [Linkvertise Dashboard](https://publisher.linkvertise.com/) → Profile / Settings (ตัวเลข user id ของบัญชี publisher)

### 4. Dev

```bash
npm run dev
```

## Linkvertise integration (default)

ระบบจะสร้าง URL Linkvertise แบบ dynamic ให้อัตโนมัติเมื่อ user กดปุ่ม "ดูโฆษณา" — flow:

```
[User] กด "ดูโฆษณา"
   ↓
POST /api/ad/start  → สร้าง Linkvertise URL พร้อม HMAC token (อายุ 10 นาที)
   ↓
[Linkvertise] user ดูโฆษณา / กดผ่าน
   ↓
GET /api/ad/complete?session=...&exp=...&sig=...
   ↓ ตรวจ HMAC + exp
mark ad_completed = true → redirect /?ad=ok
```

**กัน bypass:**
- HMAC ผูกกับ session id + วันหมดอายุ ใช้ key คนอื่นไม่ได้
- Token หมดอายุใน 10 นาที — กัน replay
- หลัง generate key ระบบจะ reset `ad_completed = false` → ต้องดูโฆษณาใหม่ทุกครั้งที่อยาก key ใหม่

## Postback fallback (สำหรับ ad server อื่น)

ถ้าใช้ ad provider ที่รองรับ server-to-server postback ใช้ endpoint นี้ได้:

```
https://<domain>/api/postback?secret=<AD_POSTBACK_SECRET>&session={subid}
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/session?id=...` | สร้างหรือคืน session + สถานะ key |
| POST | `/api/ad/start` | สร้าง Linkvertise URL สำหรับ session |
| GET | `/api/ad/complete` | callback จาก Linkvertise (verify HMAC) |
| POST | `/api/key/generate` | สร้าง key (ต้องดูโฆษณาแล้ว) |
| POST/GET | `/api/key/verify` | ตรวจสอบ key |
| GET/POST | `/api/postback` | (fallback) postback สำหรับ ad provider อื่น |

## Structure

```
app/
  page.tsx              landing
  verify/page.tsx       ตรวจสอบ key
  api/
    session/            สร้าง / ดึง session
    ad/start/           สร้าง Linkvertise URL
    ad/complete/        callback จาก Linkvertise
    key/generate/       สร้าง key
    key/verify/         ตรวจสอบ key
    postback/           postback fallback
components/ui/          shadcn primitives
lib/
  supabase.ts           supabase admin client
  linkvertise.ts        HMAC sign/verify + URL builder
  keys.ts               key generation & expiry
  utils.ts              cn, formatDuration
supabase/schema.sql     ตาราง sessions, keys, ad_events
```
