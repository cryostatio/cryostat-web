import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Observable, ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.less']
})
export class ConfirmationDialogComponent {

  title: string;
  message: string;
  destructive: boolean;

  private accept = new ReplaySubject<void>();
  private reject = new ReplaySubject<void>();

  constructor(
    public modalRef: BsModalRef,
  ) { }

  doAccept(): void {
    this.accept.next();
    this.accept.complete();
    this.hide();
  }

  doReject(): void {
    this.reject.next();
    this.reject.complete();
    this.hide();
  }

  onAccept(): Observable<void> {
    return this.accept.asObservable();
  }

  onReject(): Observable<void> {
    return this.reject.asObservable();
  }

  private hide(): void {
    this.modalRef.hide();
  }

}
