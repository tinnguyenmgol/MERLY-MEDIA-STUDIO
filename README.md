# MERLY MEDIA STUDIO

Webapp Node.js de upload nhieu clip, chen overlay/template, render MP4, tai xuong va dang video len TikTok, Facebook, YouTube.

## Chay local

```bash
npm start
```

Mo:

```text
http://localhost:3000
```

## Deploy len hosting Node.js

1. Upload toan bo thu muc nay len hosting.
2. Chon Node.js version 18 tro len.
3. Start command:

```bash
npm start
```

4. Neu hosting yeu cau entry file, dung:

```text
server.js
```

App tu doc bien moi truong `PORT`, phu hop voi Render, Railway, Hostinger Node.js, VPS, Plesk, cPanel Node.js.

`npm install` se tai them `ffmpeg-static` va `ffprobe-static` de server co the render MP4. Neu hosting khong cho dung binary tu npm package, cai FFmpeg rieng hoac set duong dan:

```bash
FFMPEG_PATH=/duong/dan/ffmpeg FFPROBE_PATH=/duong/dan/ffprobe npm start
```

Neu gap loi `EACCES`, hosting da tai FFmpeg nhung chua cho phep chay binary. Thu chay:

```bash
chmod +x node_modules/ffmpeg-static/ffmpeg
chmod +x node_modules/ffprobe-static/bin/*
```

Neu van loi, hosting dang chan chay binary trong `node_modules`; luc do can cai FFmpeg he thong va set `FFMPEG_PATH`, `FFPROBE_PATH`.

## Ghi chu

- Ban hien tai render MP4 bang FFmpeg tren server.
- Mac dinh xuat che do can bang 720p de giu overlay ro hon ma file van vua phai; co the chon sieu nhe 720p hoac 1080p net hon trong giao dien.
- Render MP4 chay theo job nen: request upload tra ve job ID nhanh, giao dien tu dong theo doi tien do de tranh timeout reverse proxy.
- File xuat ra la MP4 H.264/AAC, co the giu am goc, tron them audio rieng, thay audio rieng, hoac tat tieng.
- 8 frame nam trong `scenes` cua `app.js`, co the them/sua text, sticker, mau sac va vi tri.
- Co the upload template JSON theo mau `template-mau-giay-live.json`, hoac chinh 8 frame trong web roi bam "Tai template" de luu lai.
- Co san cac bo overlay: TikTok live toi nay, Facebook live 11h30, Facebook live 19h30, sale, hang moi ve, san pham moi + loi ich Merly.
- Sau khi render co nut dang TikTok/Facebook/YouTube. Co the dang nhap OAuth cho tung nguoi dung.
- Can cau hinh Environment variables:
  - `APP_BASE_URL=https://ten-mien-cua-ban`
  - TikTok OAuth: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`; app TikTok phai duoc duyet `video.publish`.
  - Facebook OAuth: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.
  - YouTube OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
  - Tuy chon YouTube: `YOUTUBE_PRIVACY_STATUS=private|unlisted|public`, `YOUTUBE_CATEGORY_ID=22`.
- Callback URLs can khai bao trong developer app:
  - TikTok: `https://ten-mien-cua-ban/auth/tiktok/callback`
  - Facebook: `https://ten-mien-cua-ban/auth/facebook/callback`
  - Google/YouTube: `https://ten-mien-cua-ban/auth/youtube/callback`
- Policy URLs can khai bao trong developer app:
  - Terms: `https://ten-mien-cua-ban/terms`
  - Privacy Policy: `https://ten-mien-cua-ban/privacy`
- Van co the dung token fallback neu can:
  - `TIKTOK_ACCESS_TOKEN`
  - `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`
  - `YOUTUBE_ACCESS_TOKEN`
