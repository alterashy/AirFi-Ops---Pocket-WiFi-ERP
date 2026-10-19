export interface Country {
  name: string;
  code: string;
  flag: string;
  region: string;
  dailyRate: number;
}

export interface Booth {
  id: string;
  code: string;
  name: string;
  city: string;
  terminal: string;
  totalDevices: number;
  availableDevices: number;
  inUseDevices: number;
  maintenanceDevices?: number;
}

export interface Device {
  id: string;
  imei: string;
  serialNumber: string;
  model: string;
  status: string;
  boothId: string | null;
  booth?: Booth | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  destinationCountry: string;
  countryCode?: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  rentalTotal: number;
  depositAmount: number;
  grandTotal: number;
  paymentStatus: string;
  orderStatus: string;
  midtransSnapToken?: string | null;
  midtransOrderId?: string | null;
  pickupBoothId?: string;
  returnBoothId?: string;
  pickupBooth?: Booth | null;
  returnBooth?: Booth | null;
  orderDevices: Array<{ device: Device }>;
  inspections?: Inspection[];
  createdAt: string;
}

export interface Inspection {
  id: string;
  orderId: string;
  deviceId: string;
  inspectedBy: string;
  unitCondition: "GOOD" | "SCRATCHED" | "DAMAGED" | string;
  cableReturned: boolean;
  pouchReturned: boolean;
  chargerReturned: boolean;
  allPassed: boolean;
  depositRefundStatus: "RELEASED" | "HELD" | "PARTIAL" | string;
  refundAmount: number;
  deductionFee: number;
  n8nExecutionId?: string | null;
  n8nResponseStatus?: string | null;
  notes?: string | null;
  inspectedAt: string;
  order?: Order;
  device?: Device;
}

export interface Stats {
  fleet: {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
  };
  orders: {
    active: number;
    completed: number;
  };
  refunds: {
    totalDispatched: number;
    totalInspected: number;
  };
  boothsCount: number;
}

export interface InspectionSuccessResult {
  success: boolean;
  inspection: Inspection;
  n8n: {
    success: boolean;
    orderId: string;
    status: "RELEASED" | "HELD" | "PARTIAL";
    refundAmount: number;
    deductionFee: number;
    executionId: string;
    isMock: boolean;
    message: string;
    processedAt: string;
  };
  refundSummary: {
    depositAmount: number;
    deductionFee: number;
    refundAmount: number;
    status: string;
  };
}

export interface SnapPaymentResult {
  token: string;
  redirectUrl: string;
  isMock: boolean;
  orderNumber: string;
}

export type ActiveTabType = "return" | "booking" | "fleet" | "logs";
