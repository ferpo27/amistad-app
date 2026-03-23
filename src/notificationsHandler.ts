// src/notificationsHandler.ts

import { Notification } from '../models/Notification';

class NotificationsHandler {
  private notifications: Notification[] = [];

  public addNotification(notification: Notification): void {
    this.notifications.push(notification);
  }

  public getNotifications(): Notification[] {
    return this.notifications;
  }
}

export { NotificationsHandler };