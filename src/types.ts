export interface User {
  id: number;
  name: string;
  email: string;
  role: 'donor' | 'receiver' | 'admin';
  location: string;
  is_verified: boolean;
  verification_status: 'none' | 'pending' | 'verified' | 'rejected';
  verification_id_url?: string;
  verification_face_url?: string;
  verification_ai_reason?: string;
}

export interface Listing {
  id: number;
  donor_id: number;
  donor_name?: string;
  donor_verified?: boolean;
  food_type: string;
  quantity: number;
  unit: string;
  remaining_quantity: number;
  expiry_time: string;
  location: string;
  lat?: number;
  lng?: number;
  image_url: string;
  status: 'available' | 'requested' | 'collected';
  created_at: string;
}

export interface Request {
  id: number;
  listing_id: number;
  receiver_id: number;
  receiver_name?: string;
  receiver_verified?: boolean;
  donor_name?: string;
  food_type?: string;
  location?: string;
  status: 'pending' | 'confirmed' | 'collected' | 'cancelled';
  pickup_time: string;
  requested_quantity: number;
  unit?: string;
  created_at: string;
}

export interface Feedback {
  id: number;
  from_user_id: number;
  to_user_id: number;
  rating: number;
  comment: string;
  created_at: string;
}
