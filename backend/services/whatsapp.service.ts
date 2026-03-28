export class WhatsAppService {
  static async sendMessage(to: string, message: string) {
    const apiKey = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!apiKey || !token || !from) {
      console.warn('WhatsApp no configurado. Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM');
      return;
    }
    // Llamada a Twilio API usando fetch (sin el paquete twilio para no requerir instalación)
    const credentials = Buffer.from(`${apiKey}:${token}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${apiKey}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${to}`, Body: message }).toString()
    });
  }

  static async sendDebtReminder(phone: string, ownerName: string, amount: number) {
    await this.sendMessage(phone, `Hola ${ownerName}, tiene un recibo pendiente de €${amount}. Por favor, contacte con su administración.`);
  }
}
