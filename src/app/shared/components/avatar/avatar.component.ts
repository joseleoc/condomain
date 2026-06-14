import { Component, input } from '@angular/core';
import { ImageFallback } from '@core/directives/image-fallback/image-fallback';
import { IonAvatar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  imports: [ IonAvatar, ImageFallback],
})
export class AvatarComponent {
  // --- Inputs ---
  src = input.required<string>();
  alt = input<string>('Avatar');
  width = input<number>(50);
  height = input<number>(50);
  size = input<'small' | 'medium' | 'large'>('medium');
}
