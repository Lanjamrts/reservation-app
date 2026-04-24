
export interface User {
  userId: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  role: 'admin' | 'user';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
