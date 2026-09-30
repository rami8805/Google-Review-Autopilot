import type { Notification, NotificationType } from '../../../shared/types/domain';

export interface INotificationProvider {
  dispatch(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>;
  listNotifications(saasCustomerId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
}

export class NotificationService implements INotificationProvider {
  private notifications: Notification[] = [];

  async dispatch(item: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const record: Notification = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(record);
    return record;
  }

  async listNotifications(saasCustomerId: string): Promise<Notification[]> {
    return this.notifications.filter((n) => n.saasCustomerId === saasCustomerId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const item = this.notifications.find((n) => n.id === notificationId);
    if (item) {
      item.isRead = true;
    }
  }

  async notifyApprovalRequired(
    saasCustomerId: string,
    authorName: string,
    starRating: number,
    reviewId: string
  ): Promise<void> {
    await this.dispatch({
      saasCustomerId,
      type: 'APPROVAL_REQUIRED' as NotificationType,
      title: `Approval Required: ${starRating}★ Review from ${authorName}`,
      message: `A new ${starRating}-star review requires your review and approval before publishing.`,
      channel: 'IN_APP',
      linkUrl: `/reviews?reviewId=${reviewId}`,
    });
  }
}
