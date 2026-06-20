import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CreateCondominiumPage } from './create-condominium.page';

describe('CreateCondominiumPage', () => {
  let component: CreateCondominiumPage;
  let fixture: ComponentFixture<CreateCondominiumPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, CreateCondominiumPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCondominiumPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
