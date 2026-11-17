import { withSupabase } from 'npm:@supabase/server@1';

const OPENAI_TRANSCRIPTIONS_URL =
  'https://api.openai.com/v1/audio/transcriptions';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/flac',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request) => {
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405);
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return jsonError('An audio file is required.', 400);
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError('The audio upload could not be read.', 400);
    }

    const uploadedFiles = Array.from(formData.values()).filter(
      (value): value is File => value instanceof File
    );
    const fileEntries = formData.getAll('file');

    if (
      uploadedFiles.length !== 1 ||
      fileEntries.length !== 1 ||
      !(fileEntries[0] instanceof File)
    ) {
      return jsonError('Exactly one audio file is required.', 400);
    }

    const audioFile = fileEntries[0];
    const normalizedAudioType = audioFile.type.toLowerCase();

    if (!SUPPORTED_AUDIO_TYPES.has(normalizedAudioType)) {
      return jsonError('The uploaded audio type is not supported.', 415);
    }

    if (audioFile.size === 0) {
      return jsonError('The uploaded audio file is empty.', 400);
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return jsonError('The uploaded audio file is too large.', 413);
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiApiKey) {
      return jsonError('Transcription is temporarily unavailable.', 500);
    }

    const openAiFormData = new FormData();
    openAiFormData.append('file', audioFile, audioFile.name || 'recording.m4a');
    openAiFormData.append('model', 'gpt-transcribe');

    let openAiResponse: Response;

    try {
      openAiResponse = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: openAiFormData,
      });
    } catch {
      return jsonError('Transcription failed. Please try again.', 502);
    }

    if (!openAiResponse.ok) {
      return jsonError('Transcription failed. Please try again.', 502);
    }

    let transcription: unknown;

    try {
      transcription = await openAiResponse.json();
    } catch {
      return jsonError('Transcription failed. Please try again.', 502);
    }

    if (
      typeof transcription !== 'object' ||
      transcription === null ||
      !('text' in transcription) ||
      typeof transcription.text !== 'string'
    ) {
      return jsonError('Transcription failed. Please try again.', 502);
    }

    return Response.json({ text: transcription.text });
  }),
};
