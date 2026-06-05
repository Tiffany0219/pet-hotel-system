export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  notes: string;
  imageUrl?: string;
  allergies?: string;
  medicalNotes?: string;
  vaccineDate?: string;
  vetName?: string;
  vetPhone?: string;
  emergencyContact?: string;
}

export interface Order {
  id: string;
  userId: string;
  serviceType: 'accommodation' | 'grooming';
  petId: string;
  roomType?: 'standard' | 'deluxe' | 'vip';
  groomingService?: 'basic' | 'styling' | 'spa';
  startDate: string;
  endDate?: string;
  addOnItems?: { id: string; name: string; price: number }[];
  addOnTotal?: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paidAmount?: number;
  balanceDue?: number;
  receiptNo?: string;
  paidAt?: string | null;
  createdAt: string;
  notes?: string;
  rating?: number;
  review?: string;
}
