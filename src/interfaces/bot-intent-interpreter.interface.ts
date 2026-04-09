export type BotIntentType =
  | 'quote_request'
  | 'handoff'
  | 'cancel'
  | 'affirm'
  | 'deny'
  | 'unknown';

export interface BotDetectedIntent {
  type: BotIntentType;
  confidence: number;
  entities?: Record<string, unknown>;
}

export interface BotIntentInterpreter {
  detectIntent(message: string): BotDetectedIntent;
}
