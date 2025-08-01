import express, { Request, Response } from "express";
import { db } from "../db/client";
import { users, plants } from "../db/schema"; // import your plants table
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

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
        plantId: user.plantId,
        plantName: user.plantName,
      };

      console.log("session set for user:", req.session.user);

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        plantId: user.plantId,
        plantName: user.plantName,
      });
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