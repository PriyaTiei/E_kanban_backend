import { db } from "../db/client";
import { users } from "../db/schema";
import bcrypt from "bcrypt";

async function seedUsers() {
  const userData = [
    {
      username: "gd_logistics",
      role: "logistics",
      password: "Toyota@gd_logistics",
      plantId: 1,
    },
    {
      username: "gd_supply",
      role: "supplier",
      password: "Toyota@gd_supply",
      plantId: 1,
    },
    {
      username: "tnga_supply",
      role: "supplier",
      password: "Toyota@tnga_supply",
      plantId: 2,
    },
    {
      username: "tnga_logistics",
      role: "logistics",
      password: "Toyota@tnga_logistics",
      plantId: 2,
    },
    {
      username: "admin",
      role: "admin",
      password: "Toyota@admin",
      plantId: null,
    },
  ];

  for (const user of userData) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await db.insert(users).values({
      username: user.username,
      password: hashedPassword,
      role: user.role as any,
      plantId: user.plantId,
    }).onConflictDoNothing();
    console.log(`Inserted user: ${user.username}`);
  }
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error("Error seeding users:", err);
  process.exit(1);
});