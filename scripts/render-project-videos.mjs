import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projects = require("../video-production/project-data.js");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productionRoot = join(root, "video-production");
const framesDirectory = join(productionRoot, "frames");
const audioDirectory = join(productionRoot, "audio");
const captionsDirectory = join(productionRoot, "captions");
const outputDirectory = join(productionRoot, "output");
const voice = process.env.PROJECT_VIDEO_VOICE || "Aman";
const speechRate = process.env.PROJECT_VIDEO_RATE || "174";
const selectedSlug = process.argv.find((argument) => argument.startsWith("--slug="))?.split("=")[1];
const selectedProjects = selectedSlug ? projects.filter((project) => project.slug === selectedSlug) : projects;

if (!selectedProjects.length) {
  throw new Error(`No project matched slug "${selectedSlug}".`);
}

for (const directory of [framesDirectory, audioDirectory, captionsDirectory, outputDirectory]) {
  await mkdir(directory, { recursive: true });
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd: root, stdio: options.quiet ? "ignore" : "inherit" });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${command} exited with status ${code}`));
    });
  });
}

function capture(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise(output.trim());
      else rejectPromise(new Error(`${command} exited with status ${code}`));
    });
  });
}

function formatSrtTime(seconds) {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

function buildCaptions(text, duration) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  let cursor = 0;
  return sentences.map((sentence, index) => {
    const segmentDuration = index === sentences.length - 1
      ? duration - cursor
      : duration * (sentence.length / totalCharacters);
    const start = cursor;
    const end = Math.min(duration, cursor + segmentDuration);
    cursor = end;
    return `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${sentence.trim()}\n`;
  }).join("\n");
}

async function renderProject(project) {
  const framePaths = [0, 1, 2, 3].map((scene) => join(framesDirectory, `${project.slug}-${scene + 1}.jpg`));
  for (const framePath of framePaths) {
    await readFile(framePath);
  }

  const narrationPath = join(audioDirectory, `${project.slug}.aiff`);
  const captionsPath = join(captionsDirectory, `${project.slug}.srt`);
  const outputPath = join(outputDirectory, `${project.slug}.mp4`);

  await run("say", ["-v", voice, "-r", speechRate, "-o", narrationPath, project.voiceover]);
  const duration = Number(await capture("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    narrationPath
  ]));
  const targetDuration = duration + 1.2;
  const transitionDuration = 0.8;
  const slideDuration = (targetDuration + transitionDuration * 3) / 4;
  await writeFile(captionsPath, buildCaptions(project.voiceover, duration), "utf8");

  const inputArguments = framePaths.flatMap((framePath) => [
    "-loop", "1",
    "-framerate", "30",
    "-t", slideDuration.toFixed(3),
    "-i", framePath
  ]);
  const offsets = [
    slideDuration - transitionDuration,
    slideDuration * 2 - transitionDuration * 2,
    slideDuration * 3 - transitionDuration * 3
  ];
  const filter = [
    "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p,setsar=1[v0]",
    "[1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p,setsar=1[v1]",
    "[2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p,setsar=1[v2]",
    "[3:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p,setsar=1[v3]",
    `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${offsets[0].toFixed(3)}[x1]`,
    `[x1][v2]xfade=transition=fade:duration=${transitionDuration}:offset=${offsets[1].toFixed(3)}[x2]`,
    `[x2][v3]xfade=transition=fade:duration=${transitionDuration}:offset=${offsets[2].toFixed(3)}[video]`,
    "[4:a]afade=t=in:st=0:d=0.25,afade=t=out:st=" + Math.max(0, duration - 0.45).toFixed(3) + ":d=0.45,volume=1.05[audio]"
  ].join(";");

  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "warning", "-y",
    ...inputArguments,
    "-i", narrationPath,
    "-filter_complex", filter,
    "-map", "[video]",
    "-map", "[audio]",
    "-t", targetDuration.toFixed(3),
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-metadata", `title=${project.youtubeTitle}`,
    "-metadata", "artist=Devi Prasad Choudhary Ratnala",
    "-metadata", "comment=AI-assisted project film for rdprassy.com",
    outputPath
  ]);

  console.log(`Rendered ${project.title}: ${outputPath}`);
}

for (const project of selectedProjects) {
  await renderProject(project);
}

await writeFile(
  join(outputDirectory, "youtube-metadata.json"),
  JSON.stringify(selectedProjects.map((project) => ({
    slug: project.slug,
    title: project.youtubeTitle,
    description: project.youtubeDescription,
    tags: ["rdprassy", "software engineering", "project portfolio", project.category, ...project.stack],
    visibility: "unlisted",
    video: `${project.slug}.mp4`,
    captions: `../captions/${project.slug}.srt`,
    thumbnail: `../frames/${project.slug}-1.jpg`
  })), null, 2),
  "utf8"
);

console.log(`Completed ${selectedProjects.length} project film${selectedProjects.length === 1 ? "" : "s"}.`);
