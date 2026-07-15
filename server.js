const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;
const uploadDir = path.join(publicDir, "tmp", "uploads");
const renderDir = path.join(publicDir, "renders");
const dataDir = path.join(publicDir, "data");
const sessionsPath = path.join(dataDir, "sessions.json");
function optionalRequire(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}

function firstExistingPath(paths) {
  return paths.find((item) => item && fs.existsSync(item)) || "";
}

const ffmpegStatic = optionalRequire("ffmpeg-static");
const ffprobeStatic = optionalRequire("ffprobe-static");
const localFfmpegBin = firstExistingPath([
  ffmpegStatic,
  path.join(publicDir, "node_modules", "ffmpeg-static", "ffmpeg"),
  path.join(publicDir, "node_modules", "ffmpeg-static", "ffmpeg.exe"),
]);
const localFfprobeBin = firstExistingPath([
  ffprobeStatic?.path,
  path.join(publicDir, "node_modules", "ffprobe-static", "bin", "darwin", "x64", "ffprobe"),
  path.join(publicDir, "node_modules", "ffprobe-static", "bin", "linux", "x64", "ffprobe"),
  path.join(publicDir, "node_modules", "ffprobe-static", "bin", "win32", "x64", "ffprobe.exe"),
]);
const ffmpegBin = process.env.FFMPEG_PATH || localFfmpegBin || "ffmpeg";
const ffprobeBin = process.env.FFPROBE_PATH || localFfprobeBin || "ffprobe";
const fontFile = process.env.FONT_FILE || "";

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(renderDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
app.set("trust proxy", true);

function readSessions() {
  try {
    return JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
  } catch {
    return {};
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

let sessions = readSessions();

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return index === -1 ? [item, ""] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      }),
  );
}

function saveSession(req) {
  sessions[req.sessionId] = req.session;
  writeSessions(sessions);
}

function baseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function sessionAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  let id = cookies.merly_session;
  if (!id || !sessions[id]) {
    id = randomToken();
    sessions[id] = { createdAt: Date.now(), auth: {}, oauthState: {} };
    res.setHeader("Set-Cookie", `merly_session=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    writeSessions(sessions);
  }
  req.sessionId = id;
  req.session = sessions[id];
  next();
}

function makeExecutableIfLocalBinary(command) {
  if (!command || !path.isAbsolute(command)) return;
  try {
    fs.chmodSync(command, 0o755);
  } catch {
    // Some hosts mount node_modules as read-only. Spawn will report the real error.
  }
}

makeExecutableIfLocalBinary(ffmpegBin);
makeExecutableIfLocalBinary(ffprobeBin);

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 1024 * 1024 * 800,
    files: 80,
  },
});

const renderJobs = new Map();

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    done: job.done,
    error: job.error,
    results: job.results,
  };
}

async function processRenderJob(job) {
  job.status = "running";
  try {
    for (let i = 0; i < job.videos.length; i += 1) {
      job.current = job.videos[i].originalname;
      const result = await renderOne({
        videoFile: job.videos[i],
        audioFile: job.audioFile,
        template: job.template,
        settings: job.settings,
        index: i,
      });
      job.results.push(result);
      job.done = i + 1;
    }
    job.status = "done";
  } catch (error) {
    job.status = "error";
    job.error = friendlyRenderError(error);
  } finally {
    await Promise.all([...job.videos, job.audioFile].filter(Boolean).map((file) => fsp.rm(file.path, { force: true })));
  }
}

app.use(sessionAuth);
app.get("/terms", (req, res) => {
  res.sendFile(path.join(publicDir, "terms.html"));
});
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(publicDir, "privacy.html"));
});
app.use(express.static(publicDir, { etag: false, maxAge: 0 }));
app.use("/renders", express.static(renderDir, { etag: false, maxAge: 0 }));
app.use(express.json({ limit: "2mb" }));

function redirectWithState(req, res, platform, authUrl) {
  const state = randomToken();
  req.session.oauthState[platform] = state;
  saveSession(req);
  authUrl.searchParams.set("state", state);
  res.redirect(authUrl.toString());
}

function assertState(req, platform) {
  if (!req.query.state || req.query.state !== req.session.oauthState?.[platform]) {
    throw new Error("OAuth state không hợp lệ. Vui lòng đăng nhập lại.");
  }
}

async function exchangeToken(url, params) {
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
}

app.get("/api/auth/status", (req, res) => {
  const facebookPages = req.session.auth?.facebook?.pages || [];
  res.json({
    tiktok: Boolean(req.session.auth?.tiktok?.access_token || process.env.TIKTOK_ACCESS_TOKEN),
    facebook: Boolean(req.session.auth?.facebook?.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    youtube: Boolean(req.session.auth?.youtube?.access_token || process.env.YOUTUBE_ACCESS_TOKEN),
    facebookPages: facebookPages.map((page) => ({ id: page.id, name: page.name })),
  });
});

app.get("/auth/tiktok", (req, res) => {
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    res.status(400).send("Chưa cấu hình TIKTOK_CLIENT_KEY và TIKTOK_CLIENT_SECRET.");
    return;
  }
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.TIKTOK_SCOPES || "user.info.basic,video.publish");
  url.searchParams.set("redirect_uri", `${baseUrl(req)}/auth/tiktok/callback`);
  redirectWithState(req, res, "tiktok", url);
});

app.get("/auth/tiktok/callback", async (req, res) => {
  try {
    assertState(req, "tiktok");
    const token = await exchangeToken("https://open.tiktokapis.com/v2/oauth/token/", {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code: req.query.code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl(req)}/auth/tiktok/callback`,
    });
    req.session.auth.tiktok = token;
    saveSession(req);
    res.redirect("/?auth=tiktok");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/auth/facebook", (req, res) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    res.status(400).send("Chưa cấu hình FACEBOOK_APP_ID và FACEBOOK_APP_SECRET.");
    return;
  }
  const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  url.searchParams.set("client_id", process.env.FACEBOOK_APP_ID);
  url.searchParams.set("redirect_uri", `${baseUrl(req)}/auth/facebook/callback`);
  url.searchParams.set("scope", process.env.FACEBOOK_SCOPES || "pages_show_list,pages_read_engagement,pages_manage_posts");
  redirectWithState(req, res, "facebook", url);
});

app.get("/auth/facebook/callback", async (req, res) => {
  try {
    assertState(req, "facebook");
    const token = await fetchJson(`https://graph.facebook.com/v20.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: `${baseUrl(req)}/auth/facebook/callback`,
      code: req.query.code,
    })}`);
    const pages = await fetchJson(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token.access_token)}`);
    const firstPage = pages.data?.[0] || {};
    req.session.auth.facebook = {
      access_token: token.access_token,
      pages: pages.data || [],
      pageId: firstPage.id,
      pageAccessToken: firstPage.access_token,
    };
    saveSession(req);
    res.redirect("/?auth=facebook");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/auth/youtube", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(400).send("Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.");
    return;
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", `${baseUrl(req)}/auth/youtube/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  redirectWithState(req, res, "youtube", url);
});

app.get("/auth/youtube/callback", async (req, res) => {
  try {
    assertState(req, "youtube");
    const token = await exchangeToken("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: req.query.code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl(req)}/auth/youtube/callback`,
    });
    req.session.auth.youtube = {
      ...token,
      expires_at: Date.now() + Number(token.expires_in || 3600) * 1000,
    };
    saveSession(req);
    res.redirect("/?auth=youtube");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

function binaryStatus(command) {
  const isPath = path.isAbsolute(command);
  let executable = null;
  if (isPath && fs.existsSync(command)) {
    try {
      fs.accessSync(command, fs.constants.X_OK);
      executable = true;
    } catch {
      executable = false;
    }
  }

  return {
    command,
    isPath,
    exists: isPath ? fs.existsSync(command) : null,
    executable,
  };
}

app.get("/api/ffmpeg-status", (req, res) => {
  res.json({
    cwd: process.cwd(),
    publicDir,
    ffmpeg: binaryStatus(ffmpegBin),
    ffprobe: binaryStatus(ffprobeBin),
    packageFolders: {
      ffmpegStatic: fs.existsSync(path.join(publicDir, "node_modules", "ffmpeg-static")),
      ffprobeStatic: fs.existsSync(path.join(publicDir, "node_modules", "ffprobe-static")),
    },
  });
});

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout || stderr);
      else reject(new Error(stderr || `${command} exited with ${code}`));
    });
  });
}

app.get("/api/ffmpeg-test", async (req, res) => {
  try {
    const ffmpegVersion = await run(ffmpegBin, ["-version"]);
    const ffprobeVersion = await run(ffprobeBin, ["-version"]);
    res.json({
      ok: true,
      ffmpeg: binaryStatus(ffmpegBin),
      ffprobe: binaryStatus(ffprobeBin),
      ffmpegVersion: ffmpegVersion.split("\n").slice(0, 3).join("\n"),
      ffprobeVersion: ffprobeVersion.split("\n").slice(0, 3).join("\n"),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: friendlyRenderError(error),
      rawError: error.message,
      ffmpeg: binaryStatus(ffmpegBin),
      ffprobe: binaryStatus(ffprobeBin),
    });
  }
});

function friendlyRenderError(error) {
  if (error.code === "ENOENT" || /ENOENT/i.test(error.message)) {
    return "Server chưa tìm thấy FFmpeg. Chạy npm install để tải ffmpeg-static, hoặc cài FFmpeg trên hosting rồi set FFMPEG_PATH/FFPROBE_PATH.";
  }
  if (error.code === "EACCES" || /EACCES|permission denied/i.test(error.message)) {
    return "Server tìm thấy FFmpeg nhưng không có quyền chạy file. Hãy chạy chmod +x node_modules/ffmpeg-static/ffmpeg node_modules/ffprobe-static/bin/* hoặc cài FFmpeg hệ thống rồi set FFMPEG_PATH/FFPROBE_PATH.";
  }
  return compactFfmpegError(error.message);
}

function compactFfmpegError(message) {
  const lines = String(message || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("ffmpeg version"))
    .filter((line) => !line.startsWith("ffprobe version"))
    .filter((line) => !line.startsWith("configuration:"))
    .filter((line) => !line.startsWith("libav"));

  const important = lines.filter((line) =>
    /error|invalid|failed|unable|cannot|no such|not found|option|filter|font|permission/i.test(line)
  );
  const picked = important.length ? important.slice(-8) : lines.slice(-8);
  return picked.join("\n") || "FFmpeg render lỗi nhưng không trả về chi tiết.";
}

async function getDuration(filePath) {
  try {
    const args = [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ];
    const output = await new Promise((resolve, reject) => {
      const child = spawn(ffprobeBin, args);
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr));
      });
    });
    const duration = Number(output);
    return Number.isFinite(duration) && duration > 0 ? duration : 8;
  } catch {
    return 8;
  }
}

function safeName(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function hexColor(value, fallback) {
  const match = String(value || "").match(/^#?([0-9a-f]{6})$/i);
  return `0x${match ? match[1] : fallback}`;
}

function escText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/,/g, "\\,")
    .replace(/%/g, "\\%");
}

function drawText(text, x, y, size, color, enable, extra = "") {
  const font = fontFile ? `fontfile='${fontFile.replace(/'/g, "'\\''")}':` : "";
  return `drawtext=${font}text='${escText(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}:borderw=${Math.max(4, Math.round(size * 0.11))}:bordercolor=white:shadowx=6:shadowy=6:shadowcolor=black@0.45${extra}:enable='${enable}'`;
}

function assTime(seconds) {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const cs = centiseconds % 100;
  const totalSeconds = Math.floor(centiseconds / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assColor(color) {
  const raw = String(color || "").replace(/^0x/i, "").replace(/^#/, "");
  const hex = /^[0-9a-f]{6}$/i.test(raw) ? raw : hexColor(color, "ffffff").replace("0x", "");
  return `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`;
}

function assText(value) {
  return String(value || "")
    .replace(/[{}]/g, "")
    .replace(/\r?\n/g, "\\N");
}

function assEvent(start, end, text, x, y, size, color, border = 8) {
  const body = `{\\an5\\pos(${Math.round(x)},${Math.round(y)})\\fs${Math.round(size)}\\c${assColor(color)}\\3c&H00FFFFFF\\4c&H60000000\\bord${Number(border).toFixed(1)}\\shad0}${assText(text)}`;
  return `Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${body}`;
}

function scaleCoord(value, ratio) {
  return Math.round(Number(value) * ratio);
}

function buildAss(events, width = 1080, height = 1920) {
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H60000000,-1,0,0,0,100,100,0,0,1,5,0,5,0,0,0,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}

function filterPathValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function buildVideoFilter(template, duration, assPath, settings = {}) {
  const outputWidth = Number(settings.outputWidth || 720);
  const outputHeight = Number(settings.outputHeight || 1280);
  const scaleX = outputWidth / 1080;
  const scaleY = outputHeight / 1920;
  const scaleText = Math.min(scaleX, scaleY);
  const fps = Number(settings.fps || 24);
  const scenes = Array.isArray(template.scenes) && template.scenes.length ? template.scenes.slice(0, 8) : [];
  const brand = hexColor(template.brandColor, "d54f83");
  const accent = hexColor(template.accentColor, "f5d75b");
  const footer = template.footer || "HEN CA NHA TRONG LIVE TOI NAY NHA!";
  const events = [
    assEvent(0, duration + 0.5, footer, scaleCoord(540, scaleX), scaleCoord(1874, scaleY), 40 * scaleText, "0xffffff", 0),
  ];
  const filters = [
    `[0:v]scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=increase,crop=${outputWidth}:${outputHeight},fps=${fps},setsar=1`,
    `drawbox=x=0:y=0:w=${outputWidth}:h=${scaleCoord(540, scaleY)}:color=black@0.18:t=fill`,
    `drawbox=x=0:y=${scaleCoord(1824, scaleY)}:w=${outputWidth}:h=${scaleCoord(96, scaleY)}:color=${brand}@1:t=fill`,
  ];

  scenes.forEach((scene, index) => {
    const start = (duration * index) / scenes.length;
    const end = index === scenes.length - 1 ? duration + 0.5 : (duration * (index + 1)) / scenes.length;
    const enable = `between(t\\,${start.toFixed(3)}\\,${end.toFixed(3)})`;
    const top = Number(scene.top || 250);
    const headline = String(scene.headline || "").split("\n").filter(Boolean).slice(0, 3);
    const subline = String(scene.subline || "").split("\n").filter(Boolean).slice(0, 3);

    filters.push(`drawbox=x=${scaleCoord(34, scaleX)}:y=${scaleCoord(34, scaleY)}:w=${scaleCoord(104, scaleX)}:h=${scaleCoord(104, scaleY)}:color=0xffd8e6@1:t=fill:enable='${enable}'`);
    events.push(assEvent(start, end, scene.badge || index + 1, scaleCoord(86, scaleX), scaleCoord(86, scaleY), 56 * scaleText, "0x9e3f67", 0));

    headline.forEach((line, lineIndex) => {
      const pink = /LIVE|VUA|VỪA|35|40|MAU|MẪU|FOLLOW/i.test(line);
      events.push(assEvent(start, end, line, scaleCoord(540, scaleX), scaleCoord(top + lineIndex * 112 + 48, scaleY), (lineIndex === 0 ? 88 : 96) * scaleText, pink ? brand : "0x000000", 7 * scaleText));
    });

    subline.forEach((line, lineIndex) => {
      const y = top + headline.length * 112 + 24 + lineIndex * 92;
      const isAccent = Number(scene.badge) === 6 && lineIndex === subline.length - 1;
      filters.push(`drawbox=x=${scaleCoord(160, scaleX)}:y=${scaleCoord(y, scaleY)}:w=${scaleCoord(760, scaleX)}:h=${scaleCoord(82, scaleY)}:color=${isAccent ? accent : brand}@1:t=fill:enable='${enable}'`);
      events.push(assEvent(start, end, line, scaleCoord(540, scaleX), scaleCoord(y + 42, scaleY), 52 * scaleText, isAccent ? "0x000000" : "0xffffff", 0));
    });
  });

  filters.push(`subtitles=filename='${filterPathValue(assPath)}'`);
  filters.push("format=yuv420p");
  return {
    filter: `${filters.join(",")}[vout]`,
    assContent: buildAss(events, outputWidth, outputHeight),
  };
}

function buildAudioFilter(mode, hasCustomAudio, originalVolume, customVolume) {
  if (mode !== "mix" || !hasCustomAudio) return "";
  const original = Math.max(0, Math.min(1, Number(originalVolume) / 100 || 0));
  const custom = Math.max(0, Math.min(1, Number(customVolume) / 100 || 0));
  return `;[0:a]volume=${original}[a0];[1:a]volume=${custom}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[aout]`;
}

function buildAudioArgs(mode, hasCustomAudio, settings = {}) {
  const bitrate = String(settings.audioBitrate || "96k");
  if (mode === "mute") return ["-an"];
  if (mode === "replace" && hasCustomAudio) {
    return ["-map", "1:a:0", "-shortest", "-c:a", "aac", "-b:a", bitrate];
  }
  if (mode === "mix" && hasCustomAudio) {
    return [
      "-map", "[aout]",
      "-c:a", "aac",
      "-b:a", bitrate,
    ];
  }
  return ["-map", "0:a?", "-c:a", "aac", "-b:a", bitrate];
}

function buildRenderArgs({ videoFile, audioFile, outputPath, filterPath, duration, settings, mode, hasCustomAudio, encoder = "libx264" }) {
  const threads = String(settings.threads || 1);
  const args = ["-y", "-threads", threads, "-i", videoFile.path];

  if (hasCustomAudio && (mode === "mix" || mode === "replace")) {
    args.push("-stream_loop", "-1", "-i", audioFile.path);
  }

  args.push(
    "-filter_complex_script",
    filterPath,
    "-map", "[vout]",
    ...buildAudioArgs(mode, hasCustomAudio, settings),
  );

  const fps = String(settings.fps || 24);
  if (encoder === "libx264") {
    args.push(
      "-c:v", "libx264",
      "-threads", threads,
      "-preset", "ultrafast",
      "-r", fps,
      "-crf", String(settings.crf || 34),
      "-maxrate", String(settings.maxrate || "1200k"),
      "-bufsize", String(settings.bufsize || "2400k"),
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-t", String(duration),
      outputPath,
    );
  } else {
    args.push(
      "-c:v", "mpeg4",
      "-threads", threads,
      "-q:v", String(settings.mpeg4Quality || 7),
      "-r", fps,
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-t", String(duration),
      outputPath,
    );
  }

  return args;
}

async function renderOne({ videoFile, audioFile, template, settings, index }) {
  const duration = await getDuration(videoFile.path);
  const outputName = `${settings.prefix || "live-teaser"}-${String(index + 1).padStart(3, "0")}-${safeName(videoFile.originalname)}.mp4`;
  const outputPath = path.join(renderDir, outputName);
  const filterPath = path.join(uploadDir, `${videoFile.filename}.filter.txt`);
  const assPath = path.join(uploadDir, `${videoFile.filename}.ass`);
  const hasCustomAudio = Boolean(audioFile);
  const mode = settings.audioMode || "original";

  const videoFilter = buildVideoFilter(template, duration, assPath, settings);
  const filterComplex = `${videoFilter.filter}${buildAudioFilter(mode, hasCustomAudio, settings.originalVolume, settings.customVolume)}`;
  await fsp.writeFile(filterPath, filterComplex, "utf8");
  await fsp.writeFile(assPath, videoFilter.assContent, "utf8");

  try {
    const args = buildRenderArgs({ videoFile, audioFile, outputPath, filterPath, duration, settings, mode, hasCustomAudio, encoder: "libx264" });
    try {
      await run(ffmpegBin, args);
    } catch (error) {
      if (!/Error while opening encoder|libx264|Generic error in an external library/i.test(error.message)) throw error;
      const fallbackArgs = buildRenderArgs({ videoFile, audioFile, outputPath, filterPath, duration, settings, mode, hasCustomAudio, encoder: "mpeg4" });
      await run(ffmpegBin, fallbackArgs);
    }
  } finally {
    await fsp.rm(filterPath, { force: true });
    await fsp.rm(assPath, { force: true });
  }
  return {
    name: outputName,
    url: `/renders/${encodeURIComponent(outputName)}`,
  };
}

app.post("/api/render", upload.fields([
  { name: "videos", maxCount: 60 },
  { name: "audio", maxCount: 1 },
]), (req, res) => {
  const videos = req.files?.videos || [];
  const audioFile = req.files?.audio?.[0] || null;

  if (!videos.length) {
    res.status(400).json({ error: "Chua upload video" });
    return;
  }

  try {
    const template = JSON.parse(req.body.template || "{}");
    const settings = JSON.parse(req.body.settings || "{}");
    const job = {
      id: randomToken(),
      status: "queued",
      total: videos.length,
      done: 0,
      error: "",
      results: [],
      videos,
      audioFile,
      template,
      settings,
      createdAt: Date.now(),
    };
    renderJobs.set(job.id, job);
    res.status(202).json(publicJob(job));
    setImmediate(() => processRenderJob(job));
  } catch (error) {
    Promise.all([...videos, audioFile].filter(Boolean).map((file) => fsp.rm(file.path, { force: true }))).catch(() => {});
    res.status(500).json({ error: friendlyRenderError(error) });
  }
});

app.get("/api/render/:jobId", (req, res) => {
  const job = renderJobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Khong tim thay render job" });
    return;
  }
  res.json(publicJob(job));
});

function renderedFilePath(fileName) {
  const clean = path.basename(String(fileName || ""));
  if (!clean.endsWith(".mp4")) throw new Error("File dang bai khong hop le");
  const filePath = path.join(renderDir, clean);
  if (!fs.existsSync(filePath)) throw new Error("Khong tim thay file MP4 da render");
  return filePath;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok || data.error?.code) {
    const message = data.error?.message || data.error?.code || data.raw || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function youtubeAccessToken(req) {
  const auth = req.session.auth?.youtube;
  if (!auth?.access_token) return process.env.YOUTUBE_ACCESS_TOKEN || "";
  if (!auth.refresh_token || !auth.expires_at || Date.now() < auth.expires_at - 60000) return auth.access_token;

  const refreshed = await exchangeToken("https://oauth2.googleapis.com/token", {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: auth.refresh_token,
    grant_type: "refresh_token",
  });
  req.session.auth.youtube = {
    ...auth,
    ...refreshed,
    refresh_token: auth.refresh_token,
    expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
  };
  saveSession(req);
  return req.session.auth.youtube.access_token;
}

app.post("/api/publish/tiktok", async (req, res) => {
  const token = req.session.auth?.tiktok?.access_token || process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    res.status(400).json({ error: "Chưa đăng nhập TikTok hoặc chưa cấu hình TIKTOK_ACCESS_TOKEN. TikTok cũng cần app được duyệt scope video.publish." });
    return;
  }

  try {
    const filePath = renderedFilePath(req.body.fileName);
    const stat = await fsp.stat(filePath);
    const title = String(req.body.caption || "Merly live teaser").slice(0, 2200);
    const init = await fetchJson("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title,
          privacy_level: process.env.TIKTOK_PRIVACY_LEVEL || "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: stat.size,
          chunk_size: stat.size,
          total_chunk_count: 1,
        },
      }),
    });

    const uploadUrl = init.data?.upload_url;
    if (!uploadUrl) throw new Error("TikTok không trả upload_url");
    const fileBuffer = await fsp.readFile(filePath);
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Content-Range": `bytes 0-${stat.size - 1}/${stat.size}`,
      },
      body: fileBuffer,
    });
    if (!uploadResponse.ok) throw new Error(await uploadResponse.text());
    res.json({ ok: true, platform: "tiktok", publishId: init.data?.publish_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/publish/facebook", async (req, res) => {
  const pageId = req.body.pageId || req.session.auth?.facebook?.pageId || process.env.FACEBOOK_PAGE_ID;
  const page = req.session.auth?.facebook?.pages?.find((item) => item.id === pageId);
  const token = page?.access_token || req.session.auth?.facebook?.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    res.status(400).json({ error: "Chưa đăng nhập Facebook Page hoặc chưa cấu hình FACEBOOK_PAGE_ID/FACEBOOK_PAGE_ACCESS_TOKEN." });
    return;
  }

  try {
    const filePath = renderedFilePath(req.body.fileName);
    const fileBuffer = await fsp.readFile(filePath);
    const form = new FormData();
    form.append("description", String(req.body.caption || ""));
    form.append("access_token", token);
    form.append("source", new Blob([fileBuffer], { type: "video/mp4" }), path.basename(filePath));
    const data = await fetchJson(`https://graph.facebook.com/v20.0/${pageId}/videos`, {
      method: "POST",
      body: form,
    });
    res.json({ ok: true, platform: "facebook", id: data.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/publish/youtube", async (req, res) => {
  const token = await youtubeAccessToken(req);
  if (!token) {
    res.status(400).json({ error: "Chưa đăng nhập YouTube hoặc chưa cấu hình YOUTUBE_ACCESS_TOKEN. Token cần scope youtube.upload." });
    return;
  }

  try {
    const filePath = renderedFilePath(req.body.fileName);
    const fileBuffer = await fsp.readFile(filePath);
    const caption = String(req.body.caption || "Merly live teaser");
    const title = caption.split(/\r?\n/)[0].slice(0, 100) || path.basename(filePath, ".mp4");
    const boundary = `codex_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const metadata = {
      snippet: {
        title,
        description: caption,
        categoryId: process.env.YOUTUBE_CATEGORY_ID || "22",
      },
      status: {
        privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS || "private",
        selfDeclaredMadeForKids: false,
      },
    };
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const data = await fetchJson("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    });
    res.json({ ok: true, platform: "youtube", id: data.id, url: data.id ? `https://www.youtube.com/watch?v=${data.id}` : "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "File upload quá lớn so với giới hạn server. Hãy chọn ít clip hơn hoặc clip nhỏ hơn."
      : `Upload lỗi: ${error.message}`;
    res.status(400).json({ error: message });
    return;
  }

  res.status(500).json({
    error: error.message || "Server lỗi không xác định.",
  });
});

app.listen(port, () => {
  console.log(`TikTok template app is running on http://localhost:${port}`);
});
