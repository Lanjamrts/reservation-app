import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  userId: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  /**
   * Récupère le profil complet de l'utilisateur connecté
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`);
  }

  /**
   * Met à jour le profil de l'utilisateur
   */
  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile`, data);
  }

  /**
   * Convertit une image File en base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        let result = reader.result as string;
        // Vérifie si le préfixe data:image est présent, sinon l'ajoute
        if (!result.startsWith('data:image')) {
          const ext = file.type || 'image/png';
          result = `data:${ext};base64,${btoa(result)}`;
        }
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
