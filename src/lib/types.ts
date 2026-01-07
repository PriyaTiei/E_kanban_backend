import { PgTransaction } from "drizzle-orm/pg-core";

// Extend session type
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: string;
      plantId: number;
      plantName: string;
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

export interface KanbanEntry {
  id: number;
  plantId: number;
  stationId: number;
  partId: number;
  productId: number;
  requestedAt: string;
  acknowledgedByLogistics?: boolean;
  acknowledgedAt?: string;
  fulfilled?: boolean;
  fulfilledAt?: string;
}

export interface KanbanCreateRequest {
  stationPartIds?: string[]
  rankPartIds?: string[]
}

export interface suppliedKanban {
  KANBAN_NO: string
  PART_NUMBER: string
  WIP_LOCATION: string
  CREATED_SYS_DATE: string
}

export type txType = PgTransaction<any, typeof import("/home/tnga_iot/shiva/E_kanban_GD/E_kanban_backend/src/db/schema"), any>

export interface PartScanCSVFormat {
  'SEQUENCE DATA': string,
  DATE: string,
  TIME: string,
  LOCATION: string
}