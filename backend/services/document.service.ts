import { db } from '../db/index';
import { documents } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class DocumentService {
  static async getCommunityDocuments(communityId: string) {
    try {
      return await db.select()
        .from(documents)
        .where(eq(documents.communityId, communityId))
        .orderBy(documents.uploadDate);
    } catch (error) {
      console.error('Error fetching community documents:', error);
      throw error;
    }
  }

  static async addDocument(data: {
    communityId: string;
    title: string;
    description?: string;
    fileName: string;
    fileType: string;
    category?: string;
  }) {
    try {
      const newDoc = {
        id: uuidv4(),
        ...data,
        category: data.category || 'others',
      };
      await db.insert(documents).values(newDoc);
      return newDoc;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  static async deleteDocument(id: string) {
    try {
      await db.delete(documents).where(eq(documents.id, id));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  static async getDocumentById(id: string) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return doc;
  }
}
