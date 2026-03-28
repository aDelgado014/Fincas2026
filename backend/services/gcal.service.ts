export class GoogleCalendarService {
  static async addEvent(title: string, date: string, description?: string) {
    console.warn('Google Calendar no configurado. Requiere GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
    // Full implementation requires OAuth2 flow with googleapis package
  }
}
