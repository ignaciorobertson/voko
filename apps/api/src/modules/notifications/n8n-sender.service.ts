import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';

export interface WebhookSendOptions {
  webhookUrl: string;
  eventType: string;
  payload: Record<string, any>;
  notificationId: string;
  secret?: string;
}

export interface WebhookSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export interface DispatchedWebhookRecord {
  url: string;
  eventType: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  sentAt: Date;
}

@Injectable()
export class N8nSenderService {
  private readonly logger = new Logger(N8nSenderService.name);
  private dispatchedWebhooks: DispatchedWebhookRecord[] = [];
  private simulateFailure = false;
  private failureErrorText = 'Simulated n8n endpoint unreachable';

  /**
   * Genera la firma HMAC SHA-256 para validación de seguridad en n8n
   */
  generateSignature(payloadString: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  async sendWebhook(options: WebhookSendOptions): Promise<WebhookSendResult> {
    const timestamp = new Date().toISOString();
    const payloadBody = {
      event: options.eventType,
      data: options.payload,
      id: options.notificationId,
      timestamp,
    };
    const bodyString = JSON.stringify(payloadBody);

    const secret = options.secret || process.env.N8N_WEBHOOK_SECRET || 'voko-default-n8n-secret';
    const signature = this.generateSignature(bodyString, secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Voko-Event': options.eventType,
      'X-Voko-Signature': `sha256=${signature}`,
      'X-Voko-Timestamp': timestamp,
      'X-Voko-Delivery-Id': options.notificationId,
    };

    if (this.simulateFailure) {
      this.logger.warn(`[SIMULACIÓN DE FALLO n8n] No se pudo conectar a webhook: ${options.webhookUrl}`);
      return {
        success: false,
        error: this.failureErrorText,
      };
    }

    this.dispatchedWebhooks.push({
      url: options.webhookUrl,
      eventType: options.eventType,
      payload: payloadBody,
      headers,
      sentAt: new Date(),
    });

    // En entornos reales con URL HTTP/HTTPS externa, enviar vía axios
    if (options.webhookUrl.startsWith('http://') || options.webhookUrl.startsWith('https://')) {
      try {
        const response = await axios.post(options.webhookUrl, payloadBody, {
          headers,
          timeout: 4000,
        });

        this.logger.log(`🔗 [Webhook n8n Despachado] URL: ${options.webhookUrl} (Status ${response.status})`);
        return {
          success: true,
          statusCode: response.status,
        };
      } catch (err: any) {
        const errMsg = err?.response?.data || err.message || 'Error desconocido despachando webhook n8n';
        this.logger.warn(`⚠️ [Webhook n8n Falló] URL: ${options.webhookUrl}: ${errMsg}`);
        return {
          success: false,
          statusCode: err?.response?.status,
          error: String(errMsg),
        };
      }
    }

    // Modo mock/local para testing y entornos aislados
    this.logger.log(`🔗 [Mock Webhook n8n Registrado] URL: ${options.webhookUrl} para evento ${options.eventType}`);
    return {
      success: true,
      statusCode: 200,
    };
  }

  getDispatchedWebhooks(): DispatchedWebhookRecord[] {
    return [...this.dispatchedWebhooks];
  }

  getLatestWebhook(): DispatchedWebhookRecord | undefined {
    return this.dispatchedWebhooks[this.dispatchedWebhooks.length - 1];
  }

  clearDispatchedWebhooks(): void {
    this.dispatchedWebhooks = [];
  }

  setSimulateFailure(enabled: boolean, customError = 'Simulated n8n endpoint unreachable'): void {
    this.simulateFailure = enabled;
    this.failureErrorText = customError;
  }
}
