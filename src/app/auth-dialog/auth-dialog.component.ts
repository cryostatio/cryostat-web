import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Observable, ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-auth-dialog',
  templateUrl: './auth-dialog.component.html',
  styleUrls: ['./auth-dialog.component.less']
})
export class AuthDialogComponent {

  title: string;
  message: string;
  token: string;

  private save = new ReplaySubject<string>();

  constructor(
    public modalRef: BsModalRef,
  ) { }

  doSave(): void {
    this.save.next(this.token);
    this.save.complete();
    this.hide();
  }

  onSave(): Observable<string> {
    return this.save.asObservable();
  }

  private hide(): void {
    this.modalRef.hide();
  }

}
