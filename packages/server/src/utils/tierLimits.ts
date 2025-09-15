import { env } from '../config/env';

export interface TierLimits {
  size: number;
  types: string[];
}

export function getUploadLimits(tier?: string): TierLimits {
  const limits = env.TIER_LIMITS;
  if (tier && tier in limits) {
    return limits[tier as keyof typeof limits];
  }
  return limits.free;
}

export function validateFileSize(fileSize: number, tier?: string): boolean {
  const limits = getUploadLimits(tier);
  return fileSize <= limits.size;
}

export function validateFileType(filename: string, tier?: string): boolean {
  const limits = getUploadLimits(tier);
  const extension = filename.toLowerCase().split('.').pop();
  return limits.types.includes(`.${extension}`);
}
