import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  static async getUserNotifications(userId: string) {
    try {
      return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(20);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  static async markAsRead(id: string) {
    try {
      await db.update(notifications)
        .set({ read: 1 })
        .where(eq(notifications.id, id));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }) {
    try {
      const newNotification = {
        id: uuidv4(),
        ...data,
        type: data.type || 'info',
        read: 0,
      };
      await db.insert(notifications).values(newNotification);
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}
