import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  ADVERTENCIA: RESEND_API_KEY no configurada. Los emails no se enviarán correctamente.');
}
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export class EmailService {
  static async sendIncidentStatusUpdate(to: string, ownerName: string, incidentTitle: string, newStatus: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: `Actualización de Incidencia: ${incidentTitle}`,
        html: `
          <h1>Hola ${ownerName},</h1>
          <p>El estado de tu incidencia "<strong>${incidentTitle}</strong>" ha cambiado a: <strong>${newStatus}</strong>.</p>
          <p>Puedes ver los detalles en tu portal de propietario.</p>
          <br/>
          <p>Saludos,<br/>El equipo de AdminFincas</p>
        `,
      });

      if (error) {
        console.error('Error sending email:', error);
      }
      return data;
    } catch (error) {
      console.error('Email service unexpected error:', error);
    }
  }

  static async sendReceiptConfirmation(to: string, ownerName: string, concept: string, amount: number, date: string) {
    try {
      await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: `Confirmación de Pago - ${concept}`,
        html: `
          <h1>Hola ${ownerName},</h1>
          <p>Hemos recibido correctamente tu pago por el concepto de: <strong>${concept}</strong>.</p>
          <p>Importe: <strong>${amount.toFixed(2)}€</strong></p>
          <p>Fecha de registro: <strong>${date}</strong></p>
          <p>Agradecemos tu puntualidad.</p>
          <br/>
          <p>Saludos,<br/>AdminFincas</p>
        `,
      });
    } catch (error) {
      console.error('Error sending receipt confirmation:', error);
    }
  }

  static async sendAssemblyCall(to: string, ownerName: string, date: string, time: string, location: string, agenda: string[]) {
    try {
      await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: `Convocatoria: Asamblea General - ${date}`,
        html: `
          <h1>Hola ${ownerName},</h1>
          <p>Por medio del presente, se le convoca a la próxima <strong>Asamblea General de Propietarios</strong>.</p>
          <p><strong>Día:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
          <p><strong>Lugar:</strong> ${location}</p>
          <hr/>
          <h3>Orden del Día:</h3>
          <ol>
            ${agenda.map(point => `<li>${point}</li>`).join('')}
            <li>Ruegos y preguntas.</li>
          </ol>
          <p>Se recuerda la importancia de su asistencia.</p>
          <br/>
          <p>Saludos,<br/>AdminFincas</p>
        `,
      });
    } catch (error) {
      console.error('Error sending assembly call:', error);
    }
  }

  static async sendGeneralNotice(to: string, ownerName: string, title: string, content: string) {
    try {
      await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: `Aviso Importante: ${title}`,
        html: `
          <h1>Hola ${ownerName},</h1>
          <p>${content}</p>
          <br/>
          <p>Para cualquier duda, no dudes en contactarnos.</p>
          <br/>
          <p>Atentamente,<br/>Administración AdminFincas</p>
        `,
      });
    } catch (error) {
      console.error('Error sending general notice:', error);
    }
  }

  static async sendWelcomeEmail(to: string, name: string) {
    try {
      await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: 'Bienvenido al Portal de Propietarios',
        html: `<h1>Bienvenido ${name}</h1><p>Tu cuenta ha sido vinculada correctamente.</p>`,
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  static async sendPendingReceiptNotice(to: string, ownerName: string, amount: number, dueDate: string) {
    try {
      await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: `Aviso de Recibo Pendiente - AdminFincas`,
        html: `
          <h1>Hola ${ownerName},</h1>
          <p>Te recordamos que tienes un recibo pendiente de pago.</p>
          <p>Importe: <strong>${amount.toFixed(2)}€</strong></p>
          <p>Fecha límite: <strong>${dueDate}</strong></p>
          <p>Puedes realizar el pago a través del portal o por transferencia bancaria habitual.</p>
          <br/>
          <p>Atentamente,<br/>Administración AdminFincas</p>
        `,
      });
    } catch (error) {
      console.error('Error sending pending receipt notice:', error);
    }
  }

  static async sendMinutesAvailable(to: string, ownerName: string, title: string) {
    try {
      await resend.emails.send({
        from: 'AdminFincas <onboarding@resend.dev>',
        to: [to],
        subject: `Nueva Acta Disponible: ${title}`,
        html: `
          <h1>Hola ${ownerName},</h1>
          <p>El acta de la última asamblea "<strong>${title}</strong>" ya está disponible para su consulta en el portal de propietarios.</p>
          <p>Puedes descargarla en la sección de Documentos.</p>
          <br/>
          <p>Saludos,<br/>AdminFincas</p>
        `,
      });
    } catch (error) {
      console.error('Error sending minutes available notice:', error);
    }
  }
}
