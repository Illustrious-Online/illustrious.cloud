import { db } from "@/drizzle/db";
import { notification, user } from "@/drizzle/schema";
import type { InsertNotification, Notification } from "@/drizzle/schema";
import { NotFoundError } from "@/plugins/error";
import { and, eq, or, desc, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Notification types
 */
export const NotificationType = {
  OWNERSHIP_TRANSFER: "ownership_transfer",
  INVITATION: "invitation",
  INVOICE_ASSIGNED: "invoice_assigned",
  REPORT_ASSIGNED: "report_assigned",
} as const;

export interface GetUserNotificationsOptions {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Creates a notification for a user
 * @param data - Notification data (without id)
 * @returns Promise resolving to the created notification
 */
export async function createNotification(
  data: Omit<InsertNotification, "id" | "createdAt">,
): Promise<Notification> {
  // Validate user exists
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, data.userId))
    .limit(1);

  if (!foundUser) {
    throw new NotFoundError("User not found");
  }

  const notificationId = uuidv4();
  const [newNotification] = await db
    .insert(notification)
    .values({
      id: notificationId,
      ...data,
      createdAt: new Date(),
    })
    .returning();

  return newNotification;
}

/**
 * Gets notifications for a user
 * @param userId - User ID
 * @param options - Optional filters and pagination
 * @returns Promise resolving to array of notifications
 */
export async function getUserNotifications(
  userId: string,
  options: GetUserNotificationsOptions = {},
): Promise<Notification[]> {
  const { unreadOnly = false, type, limit = 50, offset = 0 } = options;

  // Build conditions
  const conditions = [eq(notification.userId, userId)];

  if (unreadOnly) {
    conditions.push(eq(notification.read, false));
  }

  if (type) {
    conditions.push(eq(notification.type, type));
  }

  const notifications = await db
    .select()
    .from(notification)
    .where(and(...conditions))
    .orderBy(desc(notification.createdAt))
    .limit(limit)
    .offset(offset);

  // Filter expired notifications in memory
  const now = new Date();
  return notifications.filter(
    (n) => !n.expiresAt || n.expiresAt > now,
  );
}

/**
 * Marks a notification as read
 * @param notificationId - Notification ID
 * @param userId - User ID (for validation)
 * @returns Promise resolving to the updated notification
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<Notification> {
  // Validate notification belongs to user
  const [foundNotification] = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.userId, userId),
      ),
    )
    .limit(1);

  if (!foundNotification) {
    throw new NotFoundError("Notification not found");
  }

  const [updated] = await db
    .update(notification)
    .set({
      read: true,
      updatedAt: new Date(),
    })
    .where(eq(notification.id, notificationId))
    .returning();

  return updated;
}

/**
 * Deletes a notification (dismiss)
 * @param notificationId - Notification ID
 * @param userId - User ID (for validation)
 * @returns Promise resolving when deleted
 */
export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<void> {
  // Validate notification belongs to user
  const [foundNotification] = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.userId, userId),
      ),
    )
    .limit(1);

  if (!foundNotification) {
    throw new NotFoundError("Notification not found");
  }

  await db.delete(notification).where(eq(notification.id, notificationId));
}

/**
 * Gets count of unread notifications for a user
 * @param userId - User ID
 * @returns Promise resolving to count of unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const notifications = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        eq(notification.read, false),
      ),
    );

  // Filter expired in memory
  const now = new Date();
  const unread = notifications.filter(
    (n) => !n.expiresAt || n.expiresAt > now,
  );

  return unread.length;
}

/**
 * Removes expired notifications (optional cleanup function)
 * @returns Promise resolving to count of deleted notifications
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  const now = new Date();
  const result = await db
    .delete(notification)
    .where(lt(notification.expiresAt, now));

  return result.rowCount || 0;
}

/**
 * Creates an ownership transfer notification
 * @param orgId - Organization ID
 * @param newOwnerId - New owner user ID
 * @param currentOwnerName - Current owner's name
 * @param orgName - Organization name
 * @returns Promise resolving to the created notification
 */
export async function createOwnershipTransferNotification(
  orgId: string,
  newOwnerId: string,
  currentOwnerName: string,
  orgName: string,
): Promise<Notification> {
  return createNotification({
    userId: newOwnerId,
    type: NotificationType.OWNERSHIP_TRANSFER,
    title: "Organization Ownership Transfer",
    message: `${currentOwnerName} wants to transfer ownership of "${orgName}" to you.`,
    metadata: JSON.stringify({
      orgId,
      orgName,
      currentOwnerName,
    }),
    read: false,
  });
}
