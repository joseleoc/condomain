import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CondominiumHubPage } from './condominium-hub.page';

describe('CondominiumHubPage', () => {
  let component: CondominiumHubPage;
  let fixture: ComponentFixture<CondominiumHubPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, CondominiumHubPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CondominiumHubPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
