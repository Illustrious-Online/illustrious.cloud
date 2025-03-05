/**
 * Enum representing the different roles a user can have within the system.
 *
 * @enum {number}
 * @property {number} CLIENT - Represents a client user role.
 * @property {number} EMPLOYEE - Represents an employee user role.
 * @property {number} ADMIN - Represents an admin user role.
 * @property {number} OWNER - Represents an owner user role.
 */
export enum UserRole {
  CLIENT = 1,
  EMPLOYEE = 2,
  ADMIN = 3,
  OWNER = 4,
}
