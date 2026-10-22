export interface WorkshopNotification {
  id: string;
  kind: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  href?: string;
}
export interface NotificationInbox {
  items: WorkshopNotification[];
  unread: number;
}
