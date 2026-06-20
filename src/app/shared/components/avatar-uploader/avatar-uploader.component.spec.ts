import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { AvatarUploaderComponent } from './avatar-uploader.component';

describe('AvatarUploaderComponent', () => {
  let component: AvatarUploaderComponent;
  let fixture: ComponentFixture<AvatarUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), AvatarUploaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
