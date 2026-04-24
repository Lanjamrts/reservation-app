import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService, UserProfile } from '../../services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <!-- En-tête du profil -->
      <div class="profile-header">
        <div class="profile-image-wrapper">
          <img 
            *ngIf="previewImage || profileData?.profileImage"
            [src]="previewImage || profileData?.profileImage"
            alt="Photo de profil"
            class="profile-image"
          />
          <div 
            *ngIf="!previewImage && !profileData?.profileImage"
            class="profile-image-placeholder"
          >
            <div class="placeholder-initials">
              {{ getInitials() }}
            </div>
          </div>
          <label class="image-upload-label">
            <input 
              type="file"
              accept="image/*"
              (change)="onImageSelected($event)"
              hidden
            />
            📷 Changer
          </label>
        </div>
        <div class="profile-header-info">
          <h1 class="profile-name">{{ profileData?.firstName || '' }} {{ profileData?.lastName || '' }}</h1>
          <p class="profile-username">{{ '@' + (profileData?.username || '') }}</p>
          <p class="profile-role" [ngClass]="'role-' + profileData?.role">
            {{ profileData?.role === 'admin' ? '👑 Admin' : '👤 Utilisateur' }}
          </p>
        </div>
      </div>

      <!-- Formulaire d'édition -->
      <div class="profile-form-section">
        <h2>Modifier le profil</h2>
        
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="profile-form">
          <!-- Prénom -->
          <div class="form-group">
            <label for="firstName">Prénom</label>
            <input
              id="firstName"
              type="text"
              formControlName="firstName"
              placeholder="Votre prénom"
              class="form-input"
            />
          </div>

          <!-- Nom -->
          <div class="form-group">
            <label for="lastName">Nom</label>
            <input
              id="lastName"
              type="text"
              formControlName="lastName"
              placeholder="Votre nom"
              class="form-input"
            />
          </div>

          <!-- Email -->
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="votre@email.com"
              class="form-input"
            />
            <small 
              *ngIf="profileForm.get('email')?.invalid && profileForm.get('email')?.touched"
              class="error-text"
            >
              Veuillez entrer un email valide
            </small>
          </div>

          <!-- Téléphone -->
          <div class="form-group">
            <label for="phone">Téléphone</label>
            <input
              id="phone"
              type="tel"
              formControlName="phone"
              placeholder="+261 34 00 000 00"
              class="form-input"
            />
          </div>

          <!-- Bio -->
          <div class="form-group">
            <label for="bio">Bio</label>
            <textarea
              id="bio"
              formControlName="bio"
              placeholder="Dites-nous quelque chose sur vous..."
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>

          <!-- Boutons d'action -->
          <div class="form-actions">
            <button
              type="submit"
              [disabled]="isSubmitting || (!profileForm.dirty && !selectedFile)"
              class="btn-save"
            >
              {{ isSubmitting ? 'Enregistrement...' : '💾 Enregistrer les modifications' }}
            </button>
            <button
              type="button"
              (click)="onCancel()"
              [disabled]="!profileForm.dirty && !selectedFile"
              class="btn-cancel"
            >
              Annuler
            </button>
          </div>

          <!-- Messages de succès/erreur -->
          <div *ngIf="successMessage" class="success-message">
            ✅ {{ successMessage }}
          </div>
          <div *ngIf="errorMessage" class="error-message">
            ❌ {{ errorMessage }}
          </div>
        </form>
      </div>

      <!-- Informations supplémentaires -->
      <div class="profile-info-section" *ngIf="profileData">
        <h3>Informations du compte</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">ID Utilisateur:</span>
            <span class="info-value">{{ profileData.userId }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Rôle:</span>
            <span class="info-value">{{ profileData.role }}</span>
          </div>
          <div class="info-item" *ngIf="profileData.createdAt">
            <span class="info-label">Inscrit depuis:</span>
            <span class="info-value">{{ profileData.createdAt | date: 'dd/MM/yyyy' }}</span>
          </div>
          <div class="info-item" *ngIf="profileData.updatedAt">
            <span class="info-label">Dernière modification:</span>
            <span class="info-value">{{ profileData.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .profile-header {
      display: flex;
      align-items: flex-start;
      gap: 30px;
      margin-bottom: 50px;
      padding: 30px;
      background: var(--gradient-gold);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }

    .profile-image-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .profile-image,
    .profile-image-placeholder {
      width: 140px;
      height: 140px;
      border-radius: var(--radius-full);
      border: 4px solid var(--bg-page);
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
    }

    .profile-image-placeholder {
      background: var(--bg-elevated);
      color: var(--text-brand);
    }

    .placeholder-initials {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--brand);
    }

    .image-upload-label {
      position: absolute;
      bottom: 0;
      right: 0;
      background: var(--brand);
      color: white;
      padding: 8px 12px;
      border-radius: var(--radius-full);
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all var(--transition-base);
      box-shadow: var(--shadow-md);
    }

    .image-upload-label:hover {
      transform: scale(1.05);
      box-shadow: var(--shadow-lg);
    }

    .profile-header-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
    }

    .profile-name {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .profile-username {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .profile-role {
      display: inline-width;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 0.875rem;
      font-weight: 600;
      width: fit-content;
      margin: 0;
    }

    .role-admin {
      background: rgba(236, 72, 153, 0.15);
      color: var(--text-brand);
    }

    .role-user {
      background: rgba(202, 138, 4, 0.15);
      color: var(--text-primary);
    }

    .profile-form-section {
      background: var(--bg-surface);
      padding: 40px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      margin-bottom: 40px;
      box-shadow: var(--shadow-md);
    }

    .profile-form-section h2 {
      margin-top: 0;
      margin-bottom: 30px;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .profile-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      grid-column: span 1;
    }

    .profile-form .form-group:last-of-type {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .form-input,
    .form-textarea {
      padding: 12px 16px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--text-primary);
      background: var(--bg-modal);
      transition: all var(--transition-base);
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--brand);
      box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.15);
    }

    .form-textarea {
      resize: vertical;
      min-height: 120px;
    }

    .error-text {
      color: var(--danger);
      font-size: 0.85rem;
    }

    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    .btn-save,
    .btn-cancel {
      padding: 12px 24px;
      border: none;
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-base);
      flex: 1;
    }

    .btn-save {
      background: var(--gradient-brand);
      color: white;
      box-shadow: var(--shadow-md);
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: var(--bg-overlay);
      color: var(--text-primary);
      border: 1px solid var(--border-default);
    }

    .btn-cancel:hover:not(:disabled) {
      border-color: var(--border-medium);
    }

    .btn-cancel:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .success-message,
    .error-message {
      grid-column: 1 / -1;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-weight: 500;
      margin-top: 16px;
    }

    .success-message {
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid var(--success-border);
    }

    .error-message {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid var(--danger-border);
    }

    .profile-info-section {
      background: var(--bg-surface);
      padding: 30px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      box-shadow: var(--shadow-md);
    }

    .profile-info-section h3 {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: var(--bg-modal);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .info-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      font-size: 1rem;
      color: var(--text-primary);
      font-weight: 500;
      word-break: break-all;
    }

    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .profile-name {
        font-size: 1.5rem;
      }

      .profile-form {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn-save,
      .btn-cancel {
        flex: auto;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  profileData: UserProfile | null = null;
  profileForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  
  // ✅ AJOUT : stocker le fichier sélectionné et la prévisualisation séparément
  selectedFile: File | null = null;
  previewImage: string | null = null;

  constructor(
    private profileService: ProfileService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.maxLength(100)],
      lastName: ['', Validators.maxLength(100)],
      email: ['', [Validators.email]],
      phone: ['', Validators.maxLength(20)],
      bio: ['', Validators.maxLength(500)],
    });
    // ✅ profileImage retiré du FormGroup — géré séparément via selectedFile
  }

  private loadProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profileData = data;
        this.profileForm.patchValue({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
        });
        this.profileForm.markAsPristine();
        // ✅ Reset de la prévisualisation et du fichier sélectionné
        this.selectedFile = null;
        this.previewImage = null;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du profil:', err);
        this.errorMessage = 'Impossible de charger le profil';
      }
    });
  }

  /**
   * ✅ CORRIGÉ : Compression + prévisualisation immédiate sans mettre dans le form
   */
  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'L\'image doit faire moins de 5MB';
      return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Veuillez sélectionner une image valide';
      return;
    }

    try {
      // ✅ Compresser l'image avant envoi pour éviter le 413
      const compressedBase64 = await this.compressImage(file, 800, 800, 0.7);
      
      this.selectedFile = file;
      this.previewImage = compressedBase64; // Affichage immédiat dans le header
      
      this.successMessage = 'Image sélectionnée. Cliquez sur Enregistrer pour sauvegarder.';
      setTimeout(() => this.successMessage = '', 3000);
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage = 'Erreur lors de la lecture de l\'image';
    }
  }

  /**
   * ✅ NOUVEAU : Compression d'image via canvas
   */
  private compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionner si trop grand
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  /**
   * ✅ CORRIGÉ : Envoie FormData avec l'image compressée en base64
   */
  onSubmit(): void {
    if (!this.profileForm.valid) {
      this.errorMessage = 'Veuillez corriger les erreurs du formulaire';
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    // ✅ Construire le payload avec l'image si sélectionnée
    const payload: any = { ...this.profileForm.value };
    if (this.previewImage) {
      payload.profileImage = this.previewImage;
    }

    this.profileService.updateProfile(payload).subscribe({
      next: (data) => {
        this.profileData = data;
        this.profileForm.markAsPristine();
        this.isSubmitting = false;
        this.selectedFile = null;
        // ✅ Garder la prévisualisation après sauvegarde
        this.successMessage = 'Profil mis à jour avec succès ! ✅';
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du profil';
        console.error('Erreur:', err);
      }
    });
  }

  onCancel(): void {
    this.loadProfile();
    this.previewImage = null;
    this.selectedFile = null;
  }

  getInitials(): string {
    const first = this.profileData?.firstName?.charAt(0) || '';
    const last = this.profileData?.lastName?.charAt(0) || '';
    const username = this.profileData?.username?.charAt(0) || '';
    return (first + last) || username;
  }
}