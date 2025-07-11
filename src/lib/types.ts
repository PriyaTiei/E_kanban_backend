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
  kanbanIds: number[];
}

export interface ProductEntry {
  id_number: string;
  created_at: string;
}

export interface ProductEntryResponse {
  data : ProductEntry[];
  pagination: {
    page: number;
    limit: number;
  }
}