import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { CommandChannelService } from 'src/app/command-channel.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-custom-recording',
  templateUrl: './custom-recording.component.html'
})
export class CustomRecordingComponent implements OnInit, OnDestroy {

  @Input() modalRef: BsModalRef;

  @Input() name = '';
  @Input() duration = 0;
  @Input() unitMultiplier = 1;
  @Input() events = '';

  private readonly submitSubject: Subject<void> = new Subject();
  private readonly subscriptions: Subscription[] = [];

  constructor(
    public svc: CommandChannelService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.submitSubject.asObservable()
        .pipe(debounceTime(100))
        .subscribe(() => {
          if (this.name === '' || this.events === '') {
            return;
          }
          if (this.duration > 0) {
            this.svc.sendMessage('dump', [ this.name.trim(), String(Math.round(this.duration * this.unitMultiplier)), this.events ]);
          } else {
            this.svc.sendMessage('start', [ this.name.trim(), this.events ]);
          }
          this.modalRef.hide();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  submit(): void {
    this.submitSubject.next();
  }
}
