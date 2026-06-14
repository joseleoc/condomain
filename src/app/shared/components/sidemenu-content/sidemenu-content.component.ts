import { Component, OnInit } from '@angular/core';
import { IonContent, IonHeader, IonAvatar } from "@ionic/angular/standalone";
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-sidemenu-content',
  templateUrl: './sidemenu-content.component.html',
  styleUrls: ['./sidemenu-content.component.scss'],
  imports: [IonContent, IonHeader, IonAvatar, AvatarComponent],
})
export class SidemenuContentComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
