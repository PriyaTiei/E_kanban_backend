import express, { Request, Response } from "express";
import { db } from "../db/client";
import { users, plants } from "../db/schema"; // import your plants table
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";

export const userAuthRouter = express.Router();

userAuthRouter.post(
  "/login",
  async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    try {
      // Join users and plants
      const userResult = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          plantId: users.plantId,
          plantName: plants.name,
          password: users.password,
        })
        .from(users)
        .leftJoin(plants, eq(users.plantId, plants.id))
        .where(eq(users.username, username));

      const user = userResult[0];
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Set session
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        plantId: user.role === 'admin' && !user.plantId ? 1 : user.plantId!,
        plantName: !user.plantName ? user.plantId === 1 ? "GD" : "TNGA" : user.plantName,
      };

      console.log("session set for user:", req.session.user);

      res.json(req.session.user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

userAuthRouter.post(
  "/logout",
  (req: Request, res: Response): void => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  }
);

userAuthRouter.get(
  "/me",
  (req: Request, res: Response): void => {

    if (req.session.user) {
      res.json(req.session.user);
      return;
    }
    res.status(401).json({ error: "Not authenticated" });
  }
);

userAuthRouter.post(
  "/change-plant",
  async (req: Request, res: Response): Promise<void> => {
    const { plantId } = req.body;
    if (!req.session.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    
    if (req.session.user.role !== 'admin') {
      res.status(403).json({ error: "Only admins can change plant" });
      return;
    }

    if (!plantId) {
      res.status(400).json({ error: "plantId is required" });
      return;
    }

    const plantName = await db.select({plantName: plants.name}).from(plants).where(eq(plants.id, plantId));

    await db.update(users)
    .set({ plantId })
    .where(and(
      eq(users.id, req.session.user.id), 
        eq(users.role, 'admin')
      ));

    req.session.user.plantId = plantId;
    req.session.user.plantName = plantName[0]?.plantName;

    console.log("Plant changed for user:", req.session.user);
      
    res.json(req.session.user);
})