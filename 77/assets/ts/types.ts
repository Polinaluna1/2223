export type ShipmentFilter = "all" | "pending" | "in-transit" | "delivered";

export interface Shipment {
  id: string;
  trackingNumber: string;
  destination: string;
  status: "pending" | "in-transit" | "delivered";
  createdAt: number;
}

export interface ShipmentStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
}