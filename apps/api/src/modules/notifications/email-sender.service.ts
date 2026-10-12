import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: Date;
  messageId: string;
}

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private sentEmails: SentEmailRecord[] = [];
  private simulateFailure = false;
  private failureErrorText = 'Simulated SMTP connection timeout';

  /**
   * Envía un email utilizando el canal configurado.
   * En entornos de desarrollo y pruebas se almacena en memoria y registra en logger.
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (this.simulateFailure) {
      this.logger.warn(`[SIMULACIÓN DE FALLO] Falla forzada al enviar email a: ${options.to}`);
      return {
        success: false,
        error: this.failureErrorText,
      };
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const record: SentEmailRecord = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      sentAt: new Date(),
      messageId,
    };

    this.sentEmails.push(record);

    this.logger.log(
      `✉️ [Email Despachado] Destinatario: ${options.to} | Asunto: "${options.subject}" | ID: ${messageId}`,
    );

    return {
      success: true,
      messageId,
    };
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  getLatestSentEmail(): SentEmailRecord | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }

  setSimulateFailure(enabled: boolean, customError = 'Simulated SMTP connection timeout'): void {
    this.simulateFailure = enabled;
    this.failureErrorText = customError;
  }
}
