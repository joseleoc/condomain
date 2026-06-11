import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  public client: SupabaseClient;

  constructor() {
    // Initialize the client using your environment variables
    this.client = createClient(
      environment.supabaseUrl,
      environment.supabasePublishableKey,
    );
  }
}
