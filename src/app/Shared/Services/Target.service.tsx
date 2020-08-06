import { Observable, Subject, BehaviorSubject } from 'rxjs';

class TargetService {

  private readonly subj: Subject<string> = new BehaviorSubject('');

  setTarget(target: string): void {
    this.subj.next(target);
  }

  target(): Observable<string> {
    return this.subj.asObservable();
  }

}

const TargetInstance = new TargetService();

export { TargetService, TargetInstance }
