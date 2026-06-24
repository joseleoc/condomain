import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { ContextStatusComponent } from './context-status.component';

@Component({
  template: `
    <app-context-status
      [isAdmin]="isAdmin()"
      [isOnline]="isOnline()"
      [hasActiveCondominium]="true"
    />
  `,
  standalone: true,
  imports: [ContextStatusComponent, SharedTestingModule],
})
class TestHostComponent {
  isAdmin = signal(true);
  isOnline = signal(true);
}

describe('ContextStatusComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(host).toBeTruthy();
  });

  it('should not show any badges when admin and online', () => {
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('ion-chip');
    expect(chips.length).toBe(0);
  });

  it('should show offline badge when not online', () => {
    host.isOnline.set(false);
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('ion-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].getAttribute('color')).toBe('warning');
  });

  it('should show read-only badge when not admin and online', () => {
    host.isAdmin.set(false);
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('ion-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].getAttribute('color')).toBe('medium');
  });
});
