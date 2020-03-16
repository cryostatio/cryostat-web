import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable, ReplaySubject, ObservableInput, of } from 'rxjs';
import { filter, first, map, catchError, tap, concatMap, flatMap, combineLatest } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class ApiService {

  private readonly token = new ReplaySubject<string>(1);
  private readonly authMethod = new ReplaySubject<string>(1);

  constructor(
    private http: HttpClient,
  ) {  }

  checkAuth(token: string, method: string): Observable<boolean> {
    return this.http.post('/auth', null, { headers: this.getHeaders(token, method) })
    .pipe(
      map(v => {
        if (!this.authMethod.isStopped) {
          this.authMethod.next('');
          this.authMethod.complete();
        }
        return true;
      }),
      catchError((e: any): ObservableInput<boolean> => {
        console.error(e);
        if (e instanceof HttpErrorResponse) {
          this.authMethod.next(e.headers.get('X-WWW-Authenticate'));
          this.authMethod.complete();
        }
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
      this.http.get(recording.downloadUrl, {
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
        this.http.post('/recordings', payload, {
          headers: this.getHeaders(auths[0], auths[1]),
        }))
    );
  }

  getReport(recording: SavedRecording): Observable<string> {
    return this.getToken().pipe(
      combineLatest(this.getAuthMethod()),
      first(),
      concatMap(auths => this.http.get(recording.reportUrl, {
        responseType: 'text',
        headers: this.getHeaders(auths[0], auths[1]),
      })),
    );
  }

  private getHeaders(token: string, method: string): HttpHeaders {
    let headers = new HttpHeaders();
    if (!!token && !!method) {
      headers = headers.append('Authorization', `${method} ${token}`);
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
