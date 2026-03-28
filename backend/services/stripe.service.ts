export class StripeService {
  private static secretKey = process.env.STRIPE_SECRET_KEY;

  static async createPaymentIntent(amount: number, currency = 'eur', metadata: Record<string, string> = {}) {
    if (!this.secretKey) {
      console.warn('STRIPE_SECRET_KEY no configurada');
      return null;
    }
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: Math.round(amount * 100).toString(),
        currency,
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v])),
      }).toString(),
    });
    const data = await res.json();
    return data.client_secret;
  }
}
