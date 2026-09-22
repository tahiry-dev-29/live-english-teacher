/** MediaRecorder helpers for VoiceCallService (T93 split, no Angular deps). */

export function pickRecordingMimeType(): string {
  try {
    return MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';
  } catch {
    return 'audio/webm';
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe one finished MediaRecorder take via Whisper, forwarding a
 * non-empty transcript. Keeps the service facade under the 200-line budget.
 */
export async function transcribeRecorderTake(
  chunks: Blob[],
  mimeType: string,
  targetLanguageCode: string,
  transcribe: (
    base64: string,
    mime: string,
    lang: string,
  ) => Promise<string | null>,
  onTranscript: (text: string) => void,
): Promise<void> {
  if (chunks.length === 0) return;
  const audioBlob = new Blob(chunks, { type: mimeType });
  const base64 = await blobToBase64(audioBlob);
  if (!base64) return;
  const transcript = await transcribe(base64, mimeType, targetLanguageCode);
  if (transcript && transcript.trim()) onTranscript(transcript);
}
