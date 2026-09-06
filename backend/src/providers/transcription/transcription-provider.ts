import type { AIProvider, AudioInput, TranscriptionResult } from "../ai/ai-provider.js";

export interface TranscriptionProvider {
  transcribe(input: AudioInput): Promise<TranscriptionResult>;
}

/** Default transcription provider delegating to the configured multimodal AI provider. */
export class AITranscriptionProvider implements TranscriptionProvider {
  constructor(private readonly ai: AIProvider) {}

  transcribe(input: AudioInput): Promise<TranscriptionResult> {
    return this.ai.transcribeAudio(input);
  }
}
