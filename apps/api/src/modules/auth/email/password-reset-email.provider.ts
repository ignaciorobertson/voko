import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendPasswordResetEmailOptions {
  to: string;
  userName?: string;
  resetLink: string;
}

export interface EmailProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'resend' | 'local';
}

export interface IEmailProvider {
  sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult>;
}

/**
 * Plantilla HTML profesional y adaptable para recuperación de contraseñas
 */
function buildPasswordResetHtml(options: SendPasswordResetEmailOptions): string {
  const currentYear = new Date().getFullYear();
  const displayName = options.userName ? ` ${options.userName}` : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña — Voko</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background-color: #1e40af; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; }
    .content { padding: 36px 40px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 28px; }
    .button-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .notice { background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 24px; }
    .fallback { font-size: 12px; color: #64748b; line-height: 1.5; word-break: break-all; }
    .fallback a { color: #2563eb; text-decoration: underline; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Voko</h1>
      <p>Gestión Inteligente de Turnos y Reservas</p>
    </div>
    <div class="content">
      <h2 class="greeting">Hola${displayName},</h2>
      <p class="lead">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Voko</strong>. Haz clic en el siguiente botón para continuar:</p>
      
      <div class="button-container">
        <a href="${options.resetLink}" class="btn" target="_blank">Restablecer mi Contraseña</a>
      </div>

      <div class="notice">
        <strong>Importante:</strong> Este enlace es de <strong>un solo uso</strong> y vence en <strong>1 hora</strong> por motivos de seguridad.
      </div>

      <p class="fallback">
        Si el botón no funciona, copia y pega el siguiente enlace directo en tu navegador web:<br>
        <a href="${options.resetLink}">${options.resetLink}</a>
      </p>

      <p class="fallback" style="margin-top: 20px;">
        Si tú no solicitaste este cambio, puedes desestimar este mensaje con tranquilidad. Tu contraseña actual no ha sido modificada.
      </p>
    </div>
    <div class="footer">
      © ${currentYear} Voko SaaS. Plataforma de alta disponibilidad para turnos y reservas.<br>
      Este es un correo automático de seguridad, por favor no respondas a esta dirección.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Plantilla en texto plano para clientes de correo sin soporte HTML
 */
function buildPasswordResetText(options: SendPasswordResetEmailOptions): string {
  const displayName = options.userName ? ` ${options.userName}` : '';
  return `
Voko — Restablecer Contraseña

Hola${displayName},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Voko.

Para crear una nueva contraseña, ingresa al siguiente enlace seguro:
${options.resetLink}

Este enlace es de uso único y tiene una vigencia de 1 hora.

Si no solicitaste este restablecimiento, desestima este mensaje. Tu cuenta continúa protegida.

© ${new Date().getFullYear()} Voko SaaS
  `.trim();
}

/**
 * Proveedor Local en Memoria para Desarrollo y Pruebas Unitarias/E2E
 */
@Injectable()
export class LocalLogEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(LocalLogEmailProvider.name);
  public sentEmails: Array<SendPasswordResetEmailOptions & { sentAt: Date; messageId: string }> = [];
  private simulateFailure = false;
  private failureErrorText = 'Simulated email provider timeout';

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult> {
    if (this.simulateFailure) {
      this.logger.warn(`[SIMULACIÓN DE FALLO] Error simulado enviando correo de reseteo a: ${options.to}`);
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
      `🔑 [Recuperación de Contraseña] Email despachado a ${options.to} | ID: ${messageId}`,
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

/**
 * Proveedor Oficial de Correo mediante SDK de Resend
 */
@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly resend: Resend;

  constructor(private readonly apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<EmailProviderResult> {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'Voko <onboarding@resend.dev>';
      
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: [options.to],
        subject: 'Restablecer tu contraseña — Voko',
        html: buildPasswordResetHtml(options),
        text: buildPasswordResetText(options),
      });

      if (error) {
        this.logger.error(`Error en API oficial de Resend: ${error.name} - ${error.message}`);
        return {
          success: false,
          error: error.message,
          provider: 'resend',
        };
      }

      this.logger.log(`📧 [Resend] Correo de recuperación enviado con éxito a ${options.to} (ID: ${data?.id})`);

      return {
        success: true,
        messageId: data?.id,
        provider: 'resend',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Excepción al conectar con el SDK de Resend: ${message}`);
      return {
        success: false,
        error: message,
        provider: 'resend',
      };
    }
  }
}

/**
 * Servicio Desacoplado de Envío de Email para Seguridad
 * Selecciona el proveedor adecuado según variables de entorno (Resend SDK o Local/Dev).
 */
@Injectable()
export class DecoupledEmailService {
  private readonly logger = new Logger(DecoupledEmailService.name);
  private provider: IEmailProvider;
  public localProvider = new LocalLogEmailProvider();

  constructor() {
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey && resendKey.trim().length > 0 && !resendKey.includes('re_placeholder')) {
      this.logger.log('📧 Proveedor de correo configurado: RESEND (SDK Oficial)');
      this.provider = new ResendEmailProvider(resendKey.trim());
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
