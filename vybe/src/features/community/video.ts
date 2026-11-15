import { LIMITS } from '@/community/types';

/** Reads a video's duration in the browser before anything is uploaded. */
export function videoDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const done = (fn: () => void) => { URL.revokeObjectURL(url); fn(); };
    v.onloadedmetadata = () => {
      // Some files report Infinity until seeked; nudge them.
      if (Number.isFinite(v.duration)) done(() => resolve(v.duration));
      else { v.currentTime = 1e9; v.ontimeupdate = () => { v.ontimeupdate = null; done(() => resolve(v.duration)); }; }
    };
    v.onerror = () => done(() => reject(new Error('unreadable')));
    v.src = url;
  });
}

export type VideoCheck = { ok: true; duration: number } | { ok: false; reason: 'tooLong' | 'tooBig' | 'bad'; seconds?: number };

export async function checkVideo(file: File): Promise<VideoCheck> {
  if (!file.type.startsWith('video/')) return { ok: false, reason: 'bad' };
  if (file.size > LIMITS.maxVideoBytes) return { ok: false, reason: 'tooBig' };
  try {
    const d = await videoDuration(file);
    if (!Number.isFinite(d) || d <= 0) return { ok: false, reason: 'bad' };
    if (d > LIMITS.maxVideoSeconds + 0.5) return { ok: false, reason: 'tooLong', seconds: Math.round(d) };
    return { ok: true, duration: Math.min(d, LIMITS.maxVideoSeconds) };
  } catch {
    return { ok: false, reason: 'bad' };
  }
}
