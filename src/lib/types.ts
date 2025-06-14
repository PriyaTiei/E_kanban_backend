// Extend session type
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: string;
      plantId: number | null;
      plantName: string | null;
    };
  }
}

export interface KanbanModifyRequest {
  plantId: number;
  stationId: number;
  partId: number;
  productId: number;
}
