import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export class UsersRepository {
  static async create(data: typeof users.$inferInsert) {
    try {
      const result = await db.insert(users).values(data).returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, error: "Failed to create user." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      if (!result[0]) {
        return { success: false, error: "User not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error finding user with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve user." };
    }
  }

  static async findByUsername(username: string) {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      if (!result[0]) {
        return { success: false, error: "User not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error finding user with username "${username}":`, error);
      return { success: false, error: "Failed to retrieve user by username." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(users);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching users:", error);
      return { success: false, error: "Failed to fetch users." };
    }
  }

  static async update(id: number, updates: Partial<typeof users.$inferInsert>) {
    try {
      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      if (!result[0]) {
        return { success: false, error: "User not found or no changes applied." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error updating user with id ${id}:`, error);
      return { success: false, error: "Failed to update user." };
    }
  }

  static async delete(id: number) {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      if (!result[0]) {
        return { success: false, error: "User not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error deleting user with id ${id}:`, error);
      return { success: false, error: "Failed to delete user." };
    }
  }
}
