/**
 * Interface representing the data required to submit an inquiry.
 */
export interface SubmitInquiry {
  status: "pending" | "resolved" | "closed";
  orgId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptchaToken: string;
}

/**
 * Interface representing the data required to create an inquiry.
 */
export interface CreateInquiry {
  status: "pending" | "resolved" | "closed";
  orgId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Interface representing the data required to update an inquiry.
 */
export interface UpdateInquiry {
  id: string;
  status: "pending" | "resolved" | "closed";
}
