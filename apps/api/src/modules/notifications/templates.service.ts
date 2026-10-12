import { Injectable } from '@nestjs/common';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class TemplatesService {
  private formatDateTime(isoString?: string): string {
    if (!isoString) return 'Fecha a confirmar';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
    } catch {
      return String(isoString);
    }
  }

  private wrapBaseLayout(title: string, contentHtml: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; }
    .logo-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #38bdf8; font-weight: 800; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 12px; }
    .title { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .card-details { background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin: 16px 0; text-align: center; }
    .footer { background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">VOKO TURNOS</div>
      <h1 class="title">${title}</h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0;">Este mensaje fue generado automáticamente por <strong>Voko</strong> para la gestión de citas.</p>
      <p style="margin: 4px 0 0 0;">Por favor, no respondas a este correo.</p>
    </div>
  </div>
</body>
</html>`;
  }

  renderAppointmentConfirmed(payload: Record<string, any>): RenderedEmail {
    const businessName = payload.businessName || 'Tu Negocio';
    const serviceName = payload.serviceName || 'Servicio';
    const customerName = payload.customerName || 'Cliente';
    const dateStr = this.formatDateTime(payload.startTime);
    const branchName = payload.branchName || 'Sede Principal';
    const branchAddress = payload.branchAddress || '';
    const resourceName = payload.resourceName || 'Profesional Asignado';
    const price = payload.price ? `$${Number(payload.price).toLocaleString('es-AR')} ${payload.currency || 'ARS'}` : 'Sin costo adicional';

    const subject = `¡Tu turno en ${businessName} está confirmado!`;

    const html = this.wrapBaseLayout(
      '¡Reserva Confirmada!',
      `<p>Hola <strong>${customerName}</strong>,</p>
       <p>Tu reserva para <strong>${serviceName}</strong> en <strong>${businessName}</strong> ha sido agendada con éxito.</p>
       
       <div class="card-details">
         <div class="detail-row">
           <span class="detail-label">Servicio:</span>
           <span class="detail-value">${serviceName}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Fecha y Hora:</span>
           <span class="detail-value" style="color: #2563eb;">${dateStr}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Atendido por:</span>
           <span class="detail-value">${resourceName}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Sucursal:</span>
           <span class="detail-value">${branchName} ${branchAddress ? `(${branchAddress})` : ''}</span>
         </div>
         <div class="detail-row" style="margin-bottom: 0;">
           <span class="detail-label">Total estimado:</span>
           <span class="detail-value" style="color: #10b981;">${price}</span>
         </div>
       </div>

       <p style="font-size: 13px; color: #64748b;">
         💡 <strong>Recomendación:</strong> Te sugerimos presentarte 5 a 10 minutos antes de tu horario. Si necesitas reprogramar o cancelar, podés hacerlo desde tu área de cliente.
       </p>`
    );

    const text = `¡Tu turno en ${businessName} está confirmado!\n\n` +
      `Hola ${customerName},\n` +
      `Tu reserva para ${serviceName} está confirmada.\n\n` +
      `Detalles del turno:\n` +
      `- Fecha y hora: ${dateStr}\n` +
      `- Atendido por: ${resourceName}\n` +
      `- Sucursal: ${branchName} ${branchAddress}\n` +
      `- Precio: ${price}\n\n` +
      `Gestiona tus turnos en Voko.`;

    return { subject, html, text };
  }

  renderAppointmentCancelled(payload: Record<string, any>): RenderedEmail {
    const businessName = payload.businessName || 'Tu Negocio';
    const serviceName = payload.serviceName || 'Servicio';
    const customerName = payload.customerName || 'Cliente';
    const dateStr = this.formatDateTime(payload.startTime);
    const reason = payload.reason || 'Sin motivo especificado';

    const subject = `Aviso de turno cancelado en ${businessName}`;

    const html = this.wrapBaseLayout(
      'Turno Cancelado',
      `<p>Hola <strong>${customerName}</strong>,</p>
       <p>Te informamos que tu turno para <strong>${serviceName}</strong> en <strong>${businessName}</strong> ha sido cancelado.</p>
       
       <div class="card-details" style="background-color: #fef2f2; border-color: #fecaca;">
         <div class="detail-row">
           <span class="detail-label">Servicio:</span>
           <span class="detail-value">${serviceName}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Fecha original:</span>
           <span class="detail-value" style="color: #ef4444; text-decoration: line-through;">${dateStr}</span>
         </div>
         <div class="detail-row" style="margin-bottom: 0;">
           <span class="detail-label">Motivo informado:</span>
           <span class="detail-value">${reason}</span>
         </div>
       </div>

       <p>Si deseas reservar un nuevo turno para otro horario conveniente, podés hacerlo cuando gustes ingresando a la plataforma.</p>`
    );

    const text = `Turno cancelado en ${businessName}\n\n` +
      `Hola ${customerName},\n` +
      `Tu turno para ${serviceName} previsto para ${dateStr} ha sido cancelado.\n` +
      `Motivo: ${reason}\n\n` +
      `Podés solicitar una nueva reserva en cualquier momento.`;

    return { subject, html, text };
  }

  renderAppointmentRescheduled(payload: Record<string, any>): RenderedEmail {
    const businessName = payload.businessName || 'Tu Negocio';
    const serviceName = payload.serviceName || 'Servicio';
    const customerName = payload.customerName || 'Cliente';
    const previousDateStr = this.formatDateTime(payload.previousStartTime);
    const newDateStr = this.formatDateTime(payload.startTime);
    const branchName = payload.branchName || 'Sede Principal';
    const resourceName = payload.resourceName || 'Profesional Asignado';

    const subject = `Tu turno en ${businessName} fue reprogramado con éxito`;

    const html = this.wrapBaseLayout(
      'Turno Reprogramado',
      `<p>Hola <strong>${customerName}</strong>,</p>
       <p>Tu turno para <strong>${serviceName}</strong> en <strong>${businessName}</strong> ha sido reprogramado a una nueva fecha y horario.</p>
       
       <div class="card-details">
         <div class="detail-row">
           <span class="detail-label">Servicio:</span>
           <span class="detail-value">${serviceName}</span>
         </div>
         ${previousDateStr ? `
         <div class="detail-row">
           <span class="detail-label">Horario anterior:</span>
           <span class="detail-value" style="color: #94a3b8; text-decoration: line-through;">${previousDateStr}</span>
         </div>` : ''}
         <div class="detail-row">
           <span class="detail-label">Nuevo horario:</span>
           <span class="detail-value" style="color: #2563eb; font-size: 15px;">${newDateStr}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Atendido por:</span>
           <span class="detail-value">${resourceName}</span>
         </div>
         <div class="detail-row" style="margin-bottom: 0;">
           <span class="detail-label">Sucursal:</span>
           <span class="detail-value">${branchName}</span>
         </div>
       </div>

       <p style="font-size: 13px; color: #64748b;">
         Tu horario original ha sido liberado automáticamente para otros clientes. ¡Te esperamos en tu nuevo horario!
       </p>`
    );

    const text = `Turno reprogramado en ${businessName}\n\n` +
      `Hola ${customerName},\n` +
      `Tu turno para ${serviceName} ha sido reprogramado.\n\n` +
      `Nuevo horario: ${newDateStr}\n` +
      `Atendido por: ${resourceName}\n` +
      `Sucursal: ${branchName}\n\n` +
      `Voko Turnos.`;

    return { subject, html, text };
  }

  renderAppointmentReminder(payload: Record<string, any>): RenderedEmail {
    const businessName = payload.businessName || 'Tu Negocio';
    const serviceName = payload.serviceName || 'Servicio';
    const customerName = payload.customerName || 'Cliente';
    const dateStr = this.formatDateTime(payload.startTime);
    const branchName = payload.branchName || 'Sede Principal';
    const branchAddress = payload.branchAddress || '';
    const resourceName = payload.resourceName || 'Profesional';

    const subject = `Recordatorio: Tenés un turno mañana en ${businessName}`;

    const html = this.wrapBaseLayout(
      'Recordatorio de Turno',
      `<p>Hola <strong>${customerName}</strong>,</p>
       <p>Te recordamos que tienes una cita programada para las próximas horas en <strong>${businessName}</strong>.</p>
       
       <div class="card-details" style="background-color: #f0fdf4; border-color: #bbf7d0;">
         <div class="detail-row">
           <span class="detail-label">Servicio:</span>
           <span class="detail-value">${serviceName}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Fecha y Hora:</span>
           <span class="detail-value" style="color: #15803d; font-size: 15px;">${dateStr}</span>
         </div>
         <div class="detail-row">
           <span class="detail-label">Profesional:</span>
           <span class="detail-value">${resourceName}</span>
         </div>
         <div class="detail-row" style="margin-bottom: 0;">
           <span class="detail-label">Dirección:</span>
           <span class="detail-value">${branchName} ${branchAddress ? `(${branchAddress})` : ''}</span>
         </div>
       </div>

       <p style="font-size: 13px; color: #64748b;">
         Te esperamos puntualmente. Si tuviste un imprevisto, te solicitamos avisar con antelación o reprogramar desde tu cuenta.
       </p>`
    );

    const text = `Recordatorio de turno en ${businessName}\n\n` +
      `Hola ${customerName},\n` +
      `Recordatorio: Tu turno para ${serviceName} es el ${dateStr}.\n` +
      `Profesional: ${resourceName}\n` +
      `Ubicación: ${branchName} ${branchAddress}\n\n` +
      `¡Te esperamos!`;

    return { subject, html, text };
  }

  render(eventType: string, payload: Record<string, any>): RenderedEmail {
    switch (eventType) {
      case 'APPOINTMENT_CONFIRMED':
        return this.renderAppointmentConfirmed(payload);
      case 'APPOINTMENT_CANCELLED':
        return this.renderAppointmentCancelled(payload);
      case 'APPOINTMENT_RESCHEDULED':
        return this.renderAppointmentRescheduled(payload);
      case 'APPOINTMENT_REMINDER':
        return this.renderAppointmentReminder(payload);
      default:
        return {
          subject: `Notificación de ${payload.businessName || 'Voko'}`,
          html: this.wrapBaseLayout(
            'Notificación Voko',
            `<p>Has recibido una nueva notificación relacionada a tu reserva: <strong>${eventType}</strong></p>
             <pre style="background: #f1f5f9; padding: 12px; border-radius: 8px;">${JSON.stringify(payload, null, 2)}</pre>`
          ),
          text: `Notificación ${eventType}: ${JSON.stringify(payload)}`,
        };
    }
  }
}
