import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-sign-up-form',
  templateUrl: './sign-up-form.component.html',
  styleUrls: ['./sign-up-form.component.scss'],
  imports: [ReactiveFormsModule],
})
export class SignUpFormComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
