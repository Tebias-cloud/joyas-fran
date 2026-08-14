export interface PaymentCreateRequest {
  orderId: string;
}

export interface PaymentCreateResponse {
  url: string;
  token: string;
}

export interface PaymentCommitRequest {
  payment_id: string;
  status: string;
  external_reference?: string;
}

export interface PaymentCommitResponse {
  success: boolean;
  orderId?: string;
  message?: string;
}
