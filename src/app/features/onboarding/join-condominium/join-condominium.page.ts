import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonContent,
  IonButton,
  IonInput,
  IonText,
  IonSpinner,
} from '@ionic/angular/standalone';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';
import { Supabase } from '@core/services/supabase/supabase';
import { Profile } from '@core/services/profile/profile';
import { AlertController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-join-condominium',
  templateUrl: 'join-condominium.page.html',
  styleUrls: ['join-condominium.page.scss'],
  imports: [
    TranslocoPipe,
    IonContent,
    IonButton,
    IonInput,
    IonText,
    IonSpinner,
    MainLayoutComponent,
  ],
})
export class JoinCondominiumPage {
  private router = inject(Router);
  private supabase = inject(Supabase);
  private profileService = inject(Profile);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);

  invitationCode = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  async handleSubmit(): Promise<void> {
    const code = this.invitationCode().trim();
    
    if (code.length !== 6) {
      this.error.set('join.invalidCode');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) {
        throw new Error('No profile found');
      }

      // Find condominium by invitation code
      const { data: condominium, error: condoError } = await this.supabase.client
        .from('condominiums')
        .select('id')
        .eq('invitation_code', code)
        .is('deleted_at', null)
        .single();

      if (condoError || !condominium) {
        this.error.set('join.notFound');
        this.loading.set(false);
        return;
      }

      // Check if already has a pending request
      const { data: existingRequest } = await this.supabase.client
        .from('condominium_join_requests')
        .select('id')
        .eq('condominium_id', condominium.id)
        .eq('profile_id', profileId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        this.error.set('join.alreadyRequested');
        this.loading.set(false);
        return;
      }

      // Create join request
      const { error: insertError } = await this.supabase.client
        .from('condominium_join_requests')
        .insert({
          condominium_id: condominium.id,
          profile_id: profileId,
          invitation_code: code,
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      await this.showSuccessAlert();
      this.router.navigate(['/home']);
    } catch (err) {
      console.error('Error creating join request:', err);
      this.error.set('join.error');
    } finally {
      this.loading.set(false);
    }
  }

  private async showSuccessAlert(): Promise<void> {
    const [header, message, ok] = await Promise.all([
      firstValueFrom(this.translocoService.selectTranslate('join.successTitle')),
      firstValueFrom(this.translocoService.selectTranslate('join.successMessage')),
      firstValueFrom(this.translocoService.selectTranslate('common.ok')),
    ]);

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [ok],
    });
    await alert.present();
  }
}
