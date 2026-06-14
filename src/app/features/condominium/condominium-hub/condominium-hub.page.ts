import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-condominium-hub',
  templateUrl: './condominium-hub.page.html',
  styleUrls: ['./condominium-hub.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class CondominiumHubPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
