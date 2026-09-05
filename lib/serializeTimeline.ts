import { planAudioExport, defaultAudioExportMode, type AudioExportMode, type SourceAudioLayout } from './audio-export';
import { writeMappedXmeml } from './xmeml-audio';
/**
 * Build NLE timeline interchange files from the editor's keep ranges.
 *
 * XML / FCPXML go through @chatoctopus/timeline writers (imported from dist
 * subpaths to avoid pulling the Node-only ffprobe helper into the browser
 * bundle). AAF is produced by patching a vendored metadata-only scaffold.
 */

import { writeFCPXML } from "../node_modules/@chatoctopus/timeline/dist/fcpxml/writer.js";
import { writeXMEML } from "../node_modules/@chatoctopus/timeline/dist/xmeml/writer.js";
import {
  FRAME_RATES,
  rational,
  ZERO,
} from "../node_modules/@chatoctopus/timeline/dist/time.js";
import type { Timeline } from "@chatoctopus/timeline";
import {
  writeAafComposition,
  type AafFrameRate,
} from "@/lib/aaf/patchAaf";
import type { TimeRange } from "@/lib/types";

export type TimelineExportFormat = "resolve" | "premiere" | "fcpx" | "aaf";

export type TimelineFrameRate = AafFrameRate;

export const TIMELINE_FRAME_RATES: {
  value: TimelineFrameRate;
  label: string;
}[] = [
  { value: "23.976", label: "23.976" },
  { value: "24", label: "24" },
  { value: "25", label: "25" },
  { value: "29.97", label: "29.97" },
  { value: "30", label: "30" },
  { value: "50", label: "50" },
  { value: "59.94", label: "59.94" },
  { value: "60", label: "60" },
];

export const TIMELINE_FORMATS: {
  value: TimelineExportFormat;
  label: string;
  ext: string;
}[] = [
  { value: "resolve", label: "Resolve", ext: "xml" },
  { value: "premiere", label: "Premiere", ext: "xml" },
  { value: "fcpx", label: "Final Cut", ext: "fcpxml" },
  { value: "aaf", label: "Pro Tools", ext: "aaf" },
];

export interface TimelineExportOptions {
  keepRanges: TimeRange[];
  duration: number;
  mediaFileName: string;
  projectName?: string;
  frameRate: TimelineFrameRate;
  /** false for audio-only projects */
  withVideo: boolean;
  withAudio: boolean;
  width?: number;
  height?: number;
  audioRate?: number;
  sourceAudio?: SourceAudioLayout;
  audioExportMode?: AudioExportMode;
}

function frameRateRational(frameRate: TimelineFrameRate) {
  return FRAME_RATES[frameRate] ?? FRAME_RATES["30"];
}

function secondsToRational(seconds: number, frameRate: TimelineFrameRate) {
  const fr = frameRateRational(frameRate);
  const frames = Math.max(0, Math.round(seconds * (fr.num / fr.den)));
  return rational(frames * fr.den, fr.num);
}

/** file:// URL that NLEs can attempt to resolve; users usually relink by name. */
export function mediaFileUrl(fileName: string, forResolve = false): string {
  const encoded = fileName
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return forResolve
    ? `file://localhost/${encoded}`
    : `file:///${encoded}`;
}

export function buildNleTimeline(options: TimelineExportOptions): Timeline {
  const {
    keepRanges,
    duration,
    mediaFileName,
    projectName,
    frameRate,
    withVideo,
    withAudio,
    width = 1920,
    height = 1080,
    audioRate = options.sourceAudio?.streams[0]?.sampleRate ?? 48000,
  } = options;

  if (keepRanges.length === 0) {
    throw new Error("Everything has been deleted — nothing to export.");
  }

  const fr = frameRateRational(frameRate);
  const available = {
    startTime: ZERO,
    duration: secondsToRational(Math.max(duration, 0.001), frameRate),
  };

  const makeClip = (range: TimeRange, index: number, kind: "video" | "audio") => {
    const startTime = secondsToRational(range.start, frameRate);
    const clipDur = secondsToRational(
      Math.max(range.end - range.start, 1 / 120),
      frameRate
    );
    return {
      kind: "clip" as const,
      name: `${mediaFileName} ${index + 1}`,
      mediaReference: {
        type: "external" as const,
        name: mediaFileName,
        targetUrl: mediaFileUrl(mediaFileName, false),
        mediaKind: kind === "video" ? ("video" as const) : ("audio" as const),
        availableRange: available,
        streamInfo: {
          hasVideo: withVideo,
          hasAudio: withAudio,
          width,
          height,
          frameRate: fr,
          audioRate,
          audioChannels: withAudio ? (options.sourceAudio?.streams.reduce((n,s)=>n+s.channels,0)??2) : 0,
        },
      },
      sourceRange: { startTime, duration: clipDur },
    };
  };

  const tracks: Timeline["tracks"] = [];
  if (withVideo) {
    tracks.push({
      kind: "video",
      name: "V1",
      items: keepRanges.map((r, i) => makeClip(r, i, "video")),
    });
  }
  if (withAudio) {
    tracks.push({
      kind: "audio",
      name: "A1",
      items: keepRanges.map((r, i) => makeClip(r, i, "audio")),
    });
  }
  if (tracks.length === 0) {
    throw new Error("Nothing to put on the timeline.");
  }

  return {
    name: projectName || mediaFileName.replace(/\.[^.]+$/, "") || "Rescript Edit",
    format: {
      width,
      height,
      frameRate: fr,
      audioRate,
      audioChannels: withAudio ? (options.sourceAudio?.streams.reduce((n,s)=>n+s.channels,0)??2) : 0,
      audioLayout: "stereo",
      colorSpace: "1-1-1 (Rec. 709)",
    },
    tracks,
  };
}

export function timelineExtension(format: TimelineExportFormat, options?:TimelineExportOptions): string {
  if(format==='resolve'&&options?.sourceAudio&&options.withAudio){const plan=planAudioExport(options.sourceAudio,options.audioExportMode??defaultAudioExportMode(options.sourceAudio));if(plan.tracks.length===1&&plan.tracks[0].channels.length>1)return "fcpxml";}
  return TIMELINE_FORMATS.find((f) => f.value === format)?.ext ?? format;
}

/**
 * Drop `modDate` from the exported project.
 *
 * Final Cut Pro rejects the entire document with "DTD validation failed" when
 * it cannot parse this attribute. The upstream writer stamps an IANA zone name
 * (`2026-08-29 12:37:45 America/Los_Angeles`) where FCP wants a numeric UTC
 * offset (`-0700`), and FCP 10.6.x additionally only accepts the clock format
 * matching the user's system 12/24-hour setting. modDate is optional and we
 * have nothing meaningful to put in it, so the safe answer is to omit it.
 *
 * Attribute values are XML-escaped by the writer, so `"` and `>` cannot appear
 * inside one — matching up to the tag's `>` is safe even for odd file names.
 */
export function stripFcpxmlModDate(xml: string): string {
  return xml.replace(/(<project\b[^>]*?)\s+modDate="[^"]*"/g, "$1");
}

export function serializeTimelineXml(
  options: TimelineExportOptions,
  format: Exclude<TimelineExportFormat, "aaf">
): string {
  const timeline = buildNleTimeline(options);
  if(options.sourceAudio&&options.withAudio){
    const plan=planAudioExport(options.sourceAudio,options.audioExportMode??defaultAudioExportMode(options.sourceAudio));
    const multichannel=plan.tracks.length===1&&plan.tracks[0].channels.length>1;
    if(format==='premiere'||(format==='resolve'&&!multichannel)){
      if(plan.tracks.some(track=>track.channels.length>2))throw Error('Premiere XML supports Stereo or Discrete Channels in this exporter. Choose Discrete Channels for this source.');
      return writeMappedXmeml(options,plan,mediaFileUrl(options.mediaFileName,format==='resolve'));
    }
    if(timeline.tracks.length>1)timeline.tracks=timeline.tracks.filter(track=>track.kind==='video');
    const xml=stripFcpxmlModDate(writeFCPXML(timeline));
    // FCPXML carries a linked video/audio asset for each cut. Explicit components
    // map original source channels, without creating or remixing source files.
    const components=plan.tracks.map((track,index)=>'<audio-channel-source srcCh="'+track.channels.join(',')+'" role="dialogue.track'+(index+1)+'"/>').join('');
    return xml.replace(/(<asset-clip\b[^>]*?)\/>/g,'$1>'+components+'</asset-clip>');
  }
  if (options.audioExportMode&&options.withAudio&&!options.sourceAudio)throw Error('Inspect source audio before choosing an audio export mode.');
  if (format === "resolve") {
    for (const track of timeline.tracks) {
      for (const item of track.items) {
        if (item.kind !== "clip") continue;
        const ref = item.mediaReference;
        if (ref.type === "external") {
          ref.targetUrl = mediaFileUrl(ref.name || options.mediaFileName, true);
        }
      }
    }
    return writeXMEML(timeline);
  }
  if (format === "premiere") return writeXMEML(timeline);

  // A single FCP asset-clip carries both the video and the audio of its asset.
  // Our parallel V1/A1 tracks are the same media over the same ranges, so
  // keeping both makes the writer attach A1 as connected clips in lane 1 —
  // FCP imports that as a duplicate video overlay with doubled audio.
  if (timeline.tracks.length > 1) {
    timeline.tracks = timeline.tracks.filter((t) => t.kind === "video");
  }
  return stripFcpxmlModDate(writeFCPXML(timeline));
}

export async function serializeTimelineAaf(
  options: TimelineExportOptions
): Promise<Blob> {
  if(options.sourceAudio&&options.withAudio){const plan=planAudioExport(options.sourceAudio,options.audioExportMode??defaultAudioExportMode(options.sourceAudio));if(plan.channelCount!==2||plan.tracks.some(track=>track.channels.length!==1))throw Error('This AAF exporter supports two discrete channels only. Use Resolve XML for other layouts.');}
  return writeAafComposition({
    keepRanges: options.keepRanges,
    duration: options.duration,
    mediaFileName: options.mediaFileName,
    frameRate: options.frameRate,
    withVideo: options.withVideo,
    withAudio: options.withAudio,
  });
}

/** Trigger a browser download for an XML/FCPXML string or AAF blob. */
export function downloadTimelineBlob(
  data: string | Blob,
  filename: string,
  mime: string
): void {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: `${mime};charset=utf-8` })
      : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadTimelineExport(
  format: TimelineExportFormat,
  options: TimelineExportOptions
): Promise<void> {
  const base = (options.projectName || options.mediaFileName || "edited").replace(
    /\.[^.]+$/,
    ""
  );
  const ext = timelineExtension(format,options);
  const filename = `${base}.edited.${ext}`;

  if (format === "aaf") {
    const blob = await serializeTimelineAaf(options);
    downloadTimelineBlob(blob, filename, "application/octet-stream");
    return;
  }

  const xml = serializeTimelineXml(options, format);
  const mime = format === "fcpx" ? "application/xml" : "text/xml";
  downloadTimelineBlob(xml, filename, mime);
}
