export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profileImage?: string; // base64 or URL
}

export class GetProfileDto {
  userId: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  phone?: string;
  bio?: string;
  role: string;
  createdAt?: Date;
}
