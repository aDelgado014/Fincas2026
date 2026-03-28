import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const INCIDENTS_DB_ID = process.env.NOTION_INCIDENTS_DB_ID;

export class NotionService {
  /**
   * Syncs an incident to a Notion database.
   * If the incident doesn't have a notionPageId, it creates one.
   */
  static async syncIncident(incident: any) {
    if (!process.env.NOTION_API_KEY || !INCIDENTS_DB_ID) {
      console.warn('Notion API key or Database ID not configured.');
      return;
    }

    try {
      // Logic for creating or updating a page in Notion
      const properties: any = {
        'Título': {
          title: [
            {
              text: {
                content: incident.title || `Incidencia #${incident.id}`,
              },
            },
          ],
        },
        'Estado': {
          select: {
            name: incident.status,
          },
        },
        'ID Local': {
          rich_text: [
            {
              text: {
                content: String(incident.id),
              },
            },
          ],
        },
      };

      if (incident.description) {
        properties['Descripción'] = {
          rich_text: [
            {
              text: {
                content: incident.description,
              },
            },
          ],
        };
      }

      // If we had a notion_page_id in our DB, we would update. 
      // For now, let's just create a new one as a "mirror".
      const response = await notion.pages.create({
        parent: { database_id: INCIDENTS_DB_ID },
        properties,
      });

      return response.id;
    } catch (error: any) {
      console.error('Error syncing to Notion:', error.message);
      throw error;
    }
  }

  /**
   * Documentation sync
   */
  static async syncDocument(doc: any) {
      if (!process.env.NOTION_API_KEY || !INCIDENTS_DB_ID) return;
      
      try {
          await notion.pages.create({
              parent: { database_id: INCIDENTS_DB_ID }, // Reuse same DB or another one if configured
              properties: {
                  'Título': { title: [{ text: { content: doc.title } }] },
                  'Tipo': { select: { name: 'Documento' } },
                  'URL': { url: doc.url || '' }
              }
          });
      } catch (error: any) {
          console.error('Error syncing document to Notion:', error.message);
      }
  }
}
