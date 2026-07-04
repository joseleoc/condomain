import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  IonTabs, IonTabBar,
  IonTabButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  imports: [CommonModule, IonTabs, IonTabBar, IonTabButton],
})
export class TabsComponent implements OnInit {

  constructor() {}

  ngOnInit() {}
}
