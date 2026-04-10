import { Injectable } from '@nestjs/common';
import {
  BotDetectedIntent,
  BotIntentInterpreter,
} from '../interfaces/bot-intent-interpreter.interface';

@Injectable()
export class RuleBasedBotIntentInterpreterService
  implements BotIntentInterpreter
{
  detectIntent(message: string): BotDetectedIntent {
    const normalized = this.normalize(message);

    if (
      this.matchesAny(normalized, [
        'asesor',
        'humano',
        'agente',
        'agent',
        'support',
        '客服',
      ])
    ) {
      return { type: 'handoff', confidence: 0.95 };
    }

    if (
      this.matchesAny(normalized, [
        'cancelar',
        'cancela',
        'cancel',
        'stop',
        'salir',
        'reiniciar',
        'reset',
        '退出',
      ])
    ) {
      return { type: 'cancel', confidence: 0.95 };
    }

    if (
      this.matchesAny(normalized, [
        'si',
        'sí',
        'yes',
        'ok',
        'vale',
        'continuar',
        'confirmar',
        'crear',
        'listo',
        '继续',
        '确认',
      ])
    ) {
      return { type: 'affirm', confidence: 0.7 };
    }

    if (
      this.matchesAny(normalized, [
        'no',
        'nope',
        'negativo',
        'cancelado',
        '不要',
      ])
    ) {
      return { type: 'deny', confidence: 0.7 };
    }

    if (
      this.matchesAny(normalized, [
        'cotizacion',
        'cotización',
        'cotizar',
        'precio',
        'precios',
        'quote',
        'quotation',
        'price',
        'pricing',
        'stock',
        'disponibilidad',
        'availability',
        '报价',
        '价格',
        '库存',
      ])
    ) {
      return { type: 'quote_request', confidence: 0.9 };
    }

    return { type: 'unknown', confidence: 0.2 };
  }

  private matchesAny(normalizedMessage: string, keywords: string[]): boolean {
    return keywords.some((keyword) =>
      normalizedMessage.includes(this.normalize(keyword)),
    );
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
