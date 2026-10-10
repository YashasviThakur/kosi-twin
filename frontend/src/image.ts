// Phone photos are often 5–12 MB; the API accepts 4 MB. Shrink to at most 1600 px on the long side and
// re-encode as JPEG in the browser. The browser applies the photo's rotation (EXIF) when decoding.
const MAX_SIDE = 1600

export interface Photo {
  blob: Blob
  url: string          // object URL for display; revoke with URL.revokeObjectURL when done
  width: number
  height: number
}

export async function preparePhoto(file: Blob): Promise<Photo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode the photo'))), 'image/jpeg', 0.86))
  return { blob, url: URL.createObjectURL(blob), width, height }
}
