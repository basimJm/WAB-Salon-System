export interface SearchCustomer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly status: string;
}
export interface SearchSalon {
  readonly id: string;
  readonly name: string;
  readonly businessType: string;
  readonly audience: string;
  readonly state: string;
}
export interface SearchBooking {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: string;
  readonly appointmentStart: string;
  readonly salonId: string;
  readonly customerId: string;
}
export interface SearchMember {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: string;
  readonly salonId: string;
  readonly active: boolean;
}

/** A group is absent when the server did not search it. */
export interface SearchResponse {
  readonly customers?: readonly SearchCustomer[];
  readonly salons?: readonly SearchSalon[];
  readonly bookings?: readonly SearchBooking[];
  readonly members?: readonly SearchMember[];
}

export interface SearchRepository {
  /** Customers by phone/name, salons, bookings by reference, members; `text` has at least 2 characters. */
  search(text: string): Promise<SearchResponse>;
}
