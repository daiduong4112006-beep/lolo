export interface Key {
  id: string;
  code: string;
  type: "1day" | "1week" | "permanent";
  createdAt: string;
  expiresAt: string | null;
  status: "active" | "expired" | "used";
  note?: string;
}

export type KeyType = "1day" | "1week" | "permanent";
