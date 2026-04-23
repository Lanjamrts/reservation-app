import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationPayload {
  to: string;
  userName: string;
  resourceName: string;
  startTime: Date;
  endTime: Date;
  invoiceNumber?: string;
  amount?: number;
  type: 'booking_confirmed' | 'booking_cancelled' | 'booking_reminder' | 'payment_received';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: any = null;

  constructor(private configService: ConfigService) {
    this.initMailer();
  }

  private async initMailer() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP not configured — email notifications disabled.');
      return;
    }

    try {
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT') ?? 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log('Email (SMTP) transporter initialized.');
    } catch {
      this.logger.warn('nodemailer not installed — run: npm i nodemailer');
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const subject = this.getSubject(payload.type);
    const html = this.buildEmailHtml(payload);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Reserva App" <${this.configService.get('SMTP_USER')}>`,
          to: payload.to,
          subject,
          html,
        });
        this.logger.log(`Email sent to ${payload.to} [${payload.type}]`);
      } catch (err) {
        this.logger.error(`Email send failed: ${err.message}`);
      }
    } else {
      // Log notification for dev mode
      this.logger.log(`[DEV] Notification: ${payload.type} → ${payload.to}`);
      this.logger.log(`Subject: ${subject}`);
    }
  }

  private getSubject(type: string): string {
    switch (type) {
      case 'booking_confirmed': return '✅ Réservation confirmée — Reserva';
      case 'booking_cancelled': return '❌ Réservation annulée — Reserva';
      case 'booking_reminder': return '⏰ Rappel de réservation — Reserva';
      case 'payment_received': return '💳 Paiement reçu — Reserva';
      default: return 'Notification — Reserva';
    }
  }

  private buildEmailHtml(p: NotificationPayload): string {
    const formatDate = (d: Date) =>
      new Date(d).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

    const messages: Record<string, string> = {
      booking_confirmed: `Votre réservation de <strong>${p.resourceName}</strong> a été <span style="color:#10b981">confirmée</span>.`,
      booking_cancelled: `Votre réservation de <strong>${p.resourceName}</strong> a été <span style="color:#ef4444">annulée</span>.`,
      booking_reminder: `Rappel : votre réservation de <strong>${p.resourceName}</strong> commence bientôt.`,
      payment_received: `Votre paiement de <strong>${p.amount?.toLocaleString('fr-FR')} Ar</strong> a été reçu.<br>Facture : <strong>${p.invoiceNumber}</strong>`,
    };

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Inter',Arial,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
  <div style="max-width:540px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800">Reserva</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Gestion de salles professionnelle</p>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#1e293b">Bonjour <strong>${p.userName}</strong>,</p>
      <p style="font-size:15px;color:#475569;line-height:1.6">${messages[p.type] ?? ''}</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #e2e8f0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Salle</td><td style="color:#1e293b;font-weight:600;font-size:14px">${p.resourceName}</td></tr>
          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Début</td><td style="color:#1e293b;font-weight:600;font-size:14px">${formatDate(p.startTime)}</td></tr>
          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Fin</td><td style="color:#1e293b;font-weight:600;font-size:14px">${formatDate(p.endTime)}</td></tr>
          ${p.invoiceNumber ? `<tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Facture</td><td style="color:#6366f1;font-weight:700;font-size:14px">${p.invoiceNumber}</td></tr>` : ''}
        </table>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px">Cet email a été envoyé automatiquement par Reserva. Ne pas répondre.</p>
    </div>
  </div>
</body>
</html>`;
  }
}
