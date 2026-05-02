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
LOOTLABS_LOCKER_URL=https://loot-link.com/s/XXXXXX
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

สร้าง `AD_POSTBACK_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

หา `LOOTLABS_LOCKER_URL` ได้จาก [Lootlabs Dashboard](https://www.lootlabs.gg/) → สร้าง content locker แล้วคัดลอก URL ของมัน

### 4. Dev

```bash
npm run dev
```

## Lootlabs integration (default)

Lootlabs ใช้ **server-to-server postback** — ไม่มี redirect callback มาที่เรา ตั้งค่าใน Lootlabs dashboard:

- **Destination URL** → `${NEXT_PUBLIC_SITE_URL}/?ad=ok` (หน้าที่ user จะถูก redirect หลังทำ locker เสร็จ)
- **Postback URL** → `${NEXT_PUBLIC_SITE_URL}/api/postback?secret=<AD_POSTBACK_SECRET>&session={UNIQUE_ID}&click_id={CLICK_ID}&ip={IP}`

Flow:

```
[User] กด "ดูโฆษณา"
   ↓
POST /api/ad/start  → คืน LOOTLABS_LOCKER_URL?unique_id=<sessionId>
   ↓
[Lootlabs] user ทำ content locker / ดูโฆษณา
   ↓
S2S: Lootlabs → GET /api/postback?secret=...&session=<sessionId>
   ↓ ตรวจ secret
mark ad_completed = true
   ↓
Lootlabs redirect user → /?ad=ok
```

**กัน bypass:**
- `AD_POSTBACK_SECRET` เป็น shared secret — ห้ามใส่ใน frontend
- session ต้องมีอยู่ใน DB แล้วเท่านั้น postback ถึงจะ mark completed ได้
- หลัง generate key ระบบจะ reset `ad_completed = false` → ต้องดูโฆษณาใหม่ทุกครั้งที่อยาก key ใหม่

## Postback สำหรับ ad provider อื่น

endpoint เดียวกัน — รองรับ session alias: `session`, `subid`, `sub`, `s1`, `unique_id`:

```
https://<domain>/api/postback?secret=<AD_POSTBACK_SECRET>&session={subid}
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/session?id=...` | สร้างหรือคืน session + สถานะ key |
| POST | `/api/ad/start` | คืน Lootlabs locker URL + unique_id |
| POST | `/api/key/generate` | สร้าง key (ต้องดูโฆษณาแล้ว) |
| POST/GET | `/api/key/verify` | ตรวจสอบ key |
| GET/POST | `/api/postback` | S2S postback (Lootlabs / ad provider อื่น) |

## Structure

```
app/
  page.tsx              landing
  verify/page.tsx       ตรวจสอบ key
  api/
    session/            สร้าง / ดึง session
    ad/start/           คืน Lootlabs locker URL
    key/generate/       สร้าง key
    key/verify/         ตรวจสอบ key
    postback/           S2S postback
components/ui/          shadcn primitives
lib/
  supabase.ts           supabase admin client
  lootlabs.ts           Lootlabs locker URL builder
  keys.ts               key generation & expiry
  utils.ts              cn, formatDuration
supabase/schema.sql     ตาราง sessions, keys, ad_events
```
