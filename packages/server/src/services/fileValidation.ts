import { fileTypeFromBuffer } from "file-type";

export async function validateFileContent(buffer: Buffer) {
  const ft = await fileTypeFromBuffer(buffer);
  // ft may be undefined on small buffers; treat as invalid for binary uploads
  return ft ? { mime: ft.mime, ext: ft.ext } : { mime: null, ext: null };
}

