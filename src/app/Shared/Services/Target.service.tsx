import { Observable, Subject, ReplaySubject } from 'rxjs';

export class TargetService {

  private readonly subj: Subject<string> = new ReplaySubject();

  setTarget(target: string): void {
    this.subj.next(target);
  }

  target(): Observable<string> {
    return this.subj.asObservable();
  }

}
