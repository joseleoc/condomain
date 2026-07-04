import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonMenu,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonFooter,
  IonButton,
  IonBackButton,
} from '@ionic/angular/standalone';
import { languageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { SidemenuContentComponent } from '@shared/components/sidemenu-content/sidemenu-content.component';
import { Auth } from '@core/services/auth/auth';
import { TranslocoPipe } from '@jsverse/transloco';
import { TabsComponent } from './components/tabs/tabs.component';
import { ActivatedRoute, Data, NavigationEnd, Router } from '@angular/router';
import {
  distinctUntilChanged,
  filter,
  map,
  startWith,
  Subscription,
} from 'rxjs';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonMenu,
    IonButtons,
    IonMenuButton,
    IonIcon,
    IonFooter,
    languageSelectorComponent,
    SidemenuContentComponent,
    IonButton,
    TranslocoPipe,
    IonBackButton,
    TabsComponent,
  ],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  // --- Dependencies ---
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);
  private authService = inject(Auth);

  // --- Properties ---
  private routeSubscription: Subscription | null = null;

  title = signal<string>('');
  showBackButton = signal<boolean>(false);
  defaultHref = signal<string>('');

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    this.subscribeToRouteChanges();
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  logOut(): void {
    this.authService.signOut();
  }

  private subscribeToRouteChanges(): void {
    this.routeSubscription = this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        startWith(null),
        map(() => this.getUiStateFromDeepestRoute()),
        distinctUntilChanged(
          (a, b) =>
            a.title === b.title &&
            a.showBackButton === b.showBackButton &&
            a.defaultHref === b.defaultHref,
        ),
      )
      .subscribe((uiState) => {
        this.title.set(uiState.title);
        this.showBackButton.set(uiState.showBackButton);
        this.defaultHref.set(uiState.defaultHref);
      });
  }

  private getUiStateFromDeepestRoute(): {
    title: string;
    showBackButton: boolean;
    defaultHref: string;
  } {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const data: Data | undefined = route?.snapshot?.data;

    return {
      title: (data?.['title'] as string | undefined) ?? '',
      showBackButton:
        (data?.['showBackButton'] as boolean | undefined) ?? false,
      defaultHref: (data?.['defaultHref'] as string | undefined) ?? '',
    };
  }
}
