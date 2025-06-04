import { db } from "../db/client";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";

export class ProductRepository {
  static async create(variant: typeof products.$inferInsert["variant"]) {
    try {
      const result = await db.insert(products).values({ variant }).returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating product:", error);
      return { success: false, error: "Failed to create product." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db.select().from(products).where(eq(products.id, id));
      if (!result[0]) {
        return { success: false, error: "Product not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error finding product with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve product." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(products);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching products:", error);
      return { success: false, error: "Failed to fetch products." };
    }
  }

  static async update(id: number, updates: Partial<typeof products.$inferInsert>) {
    try {
      const result = await db.update(products)
        .set(updates)
        .where(eq(products.id, id))
        .returning();
      
      if (!result[0]) {
        return { success: false, error: "Product not found or no changes applied." };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error updating product with id ${id}:`, error);
      return { success: false, error: "Failed to update product." };
    }
  }

  static async delete(id: number) {
    try {
      const result = await db.delete(products)
        .where(eq(products.id, id))
        .returning();
      
      if (!result[0]) {
        return { success: false, error: "Product not found." };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error deleting product with id ${id}:`, error);
      return { success: false, error: "Failed to delete product." };
    }
  }
}
