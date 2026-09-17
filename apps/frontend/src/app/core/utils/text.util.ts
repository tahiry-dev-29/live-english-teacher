export function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  // Note: String.charCodeAt() n'est PAS déprécié (seuls event.keyCode/charCode le sont).
  const byteArray = Uint8Array.from(byteCharacters, (c) => c.charCodeAt(0));
  return new Blob([byteArray], { type: mimeType });
}
