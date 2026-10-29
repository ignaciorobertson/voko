import { Injectable, Logger } from '@nestjs/common';

export interface SendPasswordResetEmailOptions {
  to: string;
  userName?: string;
  resetLink: string;
  debugToken?: string;
}

export interface EmailProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'resend' | 'brevo' | 'local';
}

export interface IEmailProvider {
  sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult>;
}

@Injectable()
export class LocalLogEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(LocalLogEmailProvider.name);
  public sentEmails: Array<SendPasswordResetEmailOptions & { sentAt: Date; messageId: string }> = [];
  private simulateFailure = false;
  private failureErrorText = 'Simulated email provider timeout';

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult> {
    if (this.simulateFailure) {
      this.logger.warn(`[SIMULACIÓN DE FALLO] Error enviando correo de reseteo a: ${options.to}`);
      return {
        success: false,
        error: this.failureErrorText,
        provider: 'local',
      };
    }

    const messageId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.sentEmails.push({
      ...options,
      sentAt: new Date(),
      messageId,
    });

    this.logger.log(
      `🔑 [Recuperación de Contraseña] Email local despachado a ${options.to} | Link: ${options.resetLink} | ID: ${messageId}`,
    );

    return {
      success: true,
      messageId,
      provider: 'local',
    };
  }

  setSimulateFailure(enabled: boolean, customError?: string): void {
    this.simulateFailure = enabled;
    if (customError) this.failureErrorText = customError;
  }

  clear(): void {
    this.sentEmails = [];
  }
}

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly apiKey: string) {}

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult> {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'Voko <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.to],
          subject: 'Recuperación de contraseña — Voko',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #2563eb;">Voko — Restablecer Contraseña</h2>
              <p>Hola${options.userName ? ` ${options.userName}` : ''},</p>
              <p>Has solicitado restablecer tu contraseña en Voko. Haz clic en el siguiente enlace para continuar:</p>
              <p style="margin: 24px 0;">
                <a href="${options.resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Restablecer Contraseña
                </a>
              </p>
              <p style="color: #64748b; font-size: 13px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. El enlace expirará en 1 hora.</p>
            </div>
          `,
          text: `Voko - Restablecer Contraseña\n\nHola${options.userName ? ` ${options.userName}` : ''},\nHas solicitado restablecer tu contraseña. Ingresa a este enlace:\n${options.resetLink}\n\nSi no lo solicitaste, ignora este mensaje.`,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(`Error en API Resend (${res.status}): ${errBody}`);
        return {
          success: false,
          error: `Resend HTTP ${res.status}: ${errBody}`,
          provider: 'resend',
        };
      }

      const data = (await res.json()) as { id?: string };
      return {
        success: true,
        messageId: data.id,
        provider: 'resend',
      };
    } catch (err: any) {
      this.logger.error(`Excepción al conectar con Resend: ${err.message}`);
      return {
        success: false,
        error: err.message,
        provider: 'resend',
      };
    }
  }
}

@Injectable()
export class BrevoEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);

  constructor(private readonly apiKey: string) {}

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult> {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'no-reply@voko.app';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Voko', email: fromEmail },
          to: [{ email: options.to, name: options.userName || 'Usuario' }],
          subject: 'Recuperación de contraseña — Voko',
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Restablecer contraseña en Voko</h2>
              <p>Haz clic en el enlace para restablecer tu contraseña:</p>
              <p><a href="${options.resetLink}">${options.resetLink}</a></p>
            </div>
          `,
          textContent: `Restablecer contraseña en Voko: ${options.resetLink}`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `Brevo HTTP ${res.status}: ${errText}`,
          provider: 'brevo',
        };
      }

      const data = (await res.json()) as { messageId?: string };
      return {
        success: true,
        messageId: data.messageId,
        provider: 'brevo',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        provider: 'brevo',
      };
    }
  }
}

/**
 * Servicio Desacoplado de Envío de Email para Seguridad
 * Selecciona el proveedor adecuado según variables de entorno (Resend -> Brevo -> Local).
 */
@Injectable()
export class DecoupledEmailService {
  private readonly logger = new Logger(DecoupledEmailService.name);
  private provider: IEmailProvider;
  public localProvider = new LocalLogEmailProvider();

  constructor() {
    const resendKey = process.env.RESEND_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY;

    if (resendKey && resendKey.trim().length > 0) {
      this.logger.log('📧 Proveedor de correo configurado: RESEND (Free Tier)');
      this.provider = new ResendEmailProvider(resendKey.trim());
    } else if (brevoKey && brevoKey.trim().length > 0) {
      this.logger.log('📧 Proveedor de correo configurado: BREVO (Free Tier)');
      this.provider = new BrevoEmailProvider(brevoKey.trim());
    } else {
      this.logger.log('📧 Proveedor de correo configurado: LOCAL / DEV (Sin dependencia externa)');
      this.provider = this.localProvider;
    }
  }

  setCustomProvider(provider: IEmailProvider): void {
    this.provider = provider;
  }

  getProvider(): IEmailProvider {
    return this.provider;
  }

  async sendPasswordReset(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult> {
    return this.provider.sendPasswordResetEmail(options);
  }
}

