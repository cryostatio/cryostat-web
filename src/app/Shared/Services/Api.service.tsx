import { Subject, BehaviorSubject, Observable, ReplaySubject, ObservableInput, from, of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { filter, first, map, catchError, tap, concatMap, flatMap, combineLatest } from 'rxjs/operators';

export class ApiService {

  private readonly token = new ReplaySubject<string>(1);
  private readonly authMethod = new ReplaySubject<string>(1);
  readonly authority: string;

   constructor() {
      let apiAuthority = process.env.CONTAINER_JFR_AUTHORITY;
      if (!apiAuthority) {
        apiAuthority = '';
      }
      console.log(`Using API authority ${apiAuthority}`);
      this.authority = apiAuthority;
   }

  checkAuth(token: string, method: string): Observable<boolean> {
    return fromFetch(`${this.authority}/auth`, {
      credentials: 'include',
      mode: 'cors',
      method: 'POST',
      body: null,
      headers: this.getHeaders(token, method)
    })
    .pipe(
      map(response => {
        if (!this.authMethod.isStopped) {
          this.authMethod.next(response.ok ? method : (response.headers.get('X-WWW-Authenticate') || ''));
        }
        return response.ok;
      }),
      catchError((e: any): ObservableInput<boolean> => {
        console.error(JSON.stringify(e));
        this.authMethod.complete();
        return of(false);
      }),
      first(),
      tap(v => {
        if (v) {
          this.authMethod.next(method);
          this.authMethod.complete();
          this.token.next(token);
        }
      })
    );
  }

  getAuthMethod(): Observable<string> {
    return this.authMethod.asObservable();
  }

  getToken(): Observable<string> {
    return this.token.asObservable();
  }

  downloadRecording(recording: SavedRecording): void {
    this.getToken().pipe(
      combineLatest(this.getAuthMethod()),
      first()
    ).subscribe(auths =>
      fromFetch(recording.downloadUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: this.getHeaders(auths[0], auths[1]),
      })
      .subscribe(resp =>
        this.downloadFile(
          recording.name + (recording.name.endsWith('.jfr') ? '' : '.jfr'),
          resp,
          'application/octet-stream')
      )
    );
  }

  uploadRecording(file: File): Observable<any> {
    const payload = new FormData(); // as multipart/form-data
    payload.append('recording', file);

    return this.getToken().pipe(
      combineLatest(this.getAuthMethod()),
      first(),
      flatMap(auths =>
        fromFetch(`/recordings`, {
          credentials: 'include',
          mode: 'cors',
          body: payload,
          headers: this.getHeaders(auths[0], auths[1]),
        })),
      concatMap(resp => from(resp.text()))
    );
  }

  getReport(recording: SavedRecording): Observable<string> {
    return this.getToken().pipe(
      combineLatest(this.getAuthMethod()),
      first(),
      concatMap(auths => fromFetch(recording.reportUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: this.getHeaders(auths[0], auths[1]),
      })),
      concatMap(resp => from(resp.text())),
    );
  }

  private getHeaders(token: string, method: string): Headers {
    let headers = new Headers();
    if (!!token && !!method) {
      headers.append('Authorization', `${method} ${token}`)
    }
    return headers;
  }

  private downloadFile(filename: string, data: any, type: string): void {
    const blob = new Blob([ data ], { type } );
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = url;
    anchor.click();
    setTimeout(() => window.URL.revokeObjectURL(url));
  }

}

export interface SavedRecording {
  name: string;
  downloadUrl: string;
  reportUrl: string;
}

export interface Recording extends SavedRecording {
  id: number;
  state: string;
  duration: number;
  startTime: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
}
