import { Subject, BehaviorSubject, Observable, ReplaySubject, ObservableInput, of } from 'rxjs';
import { filter, first, map, catchError, tap, concatMap, flatMap, combineLatest } from 'rxjs/operators';
import { Axios } from 'axios-observable';
import { AxiosResponse } from 'axios';

export class ApiService {

  private readonly token = new ReplaySubject<string>(1);
  private readonly authMethod = new ReplaySubject<string>(1);

  checkAuth(token: string, method: string): Observable<boolean> {
    return Axios.post('/auth', null, { headers: this.getHeaders(token, method) })
    .pipe(
      map((v: AxiosResponse<string>) => {
        if (!this.authMethod.isStopped) {
          this.authMethod.next('');
          this.authMethod.complete();
        }
        return true;
      }),
      catchError((e: any): ObservableInput<boolean> => {
        console.error(e);
        this.authMethod.next(e.headers.get('X-WWW-Authenticate'));
        this.authMethod.complete();
        return of(false);
      }),
      first(),
      tap(v => {
        if (v) {
          this.token.next(token);
        }
      })
    );
  }

  getAuthMethod(): Observable<string> {
    return this.authMethod.asObservable().pipe(tap(v => console.log('authmethod', v)));
  }

  getToken(): Observable<string> {
    return this.token.asObservable().pipe(tap(v => console.log('authtoken', v)));
  }

  downloadRecording(recording: SavedRecording): void {
    this.getToken().pipe(
      combineLatest(this.getAuthMethod()),
      first()
    ).subscribe(auths =>
      Axios.get(recording.downloadUrl, {
        responseType: 'blob',
        headers: this.getHeaders(auths[0], auths[1]),
      })
      .subscribe(resp =>
        this.downloadFile(
          recording.name + (recording.name.endsWith('.jfr') ? '' : '.jfr')
          , resp,
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
        Axios.post('/recordings', payload, {
          headers: this.getHeaders(auths[0], auths[1]),
        })),
      map((v: AxiosResponse<any>) => v.data)
    );
  }

  getReport(recording: SavedRecording): Observable<string> {
    return this.getToken().pipe(
      combineLatest(this.getAuthMethod()),
      first(),
      concatMap(auths => Axios.get(recording.reportUrl, {
        responseType: 'text',
        headers: this.getHeaders(auths[0], auths[1]),
      })),
      map((v: AxiosResponse<string>) => v.data),
    );
  }

  private getHeaders(token: string, method: string): Map<string, string> {
    let headers = new Map();
    if (!!token && !!method) {
      headers.set('Authorization', `${method} ${token}`)
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
