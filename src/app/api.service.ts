import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable, ReplaySubject, ObservableInput, of } from 'rxjs';
import { filter, first, map, catchError, tap, concatMap, flatMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable()
export class ApiService {

  private readonly token = new ReplaySubject<string>();

  constructor(
    private http: HttpClient,
  ) {  }

  checkAuth(token: string): Observable<boolean> {
    return this.http.post('/auth', null, { headers: this.getHeaders(token) })
    .pipe(
      map(v => true),
      catchError((e: any): ObservableInput<boolean> => {
        console.error(e);
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

  getToken(): Observable<string> {
    return this.token.asObservable();
  }

  downloadRecording(recording: SavedRecording): void {
    this.token.asObservable().pipe(first()).subscribe(token =>
      this.http.get(recording.downloadUrl, {
        responseType: 'blob',
        headers: this.getHeaders(token),
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

    return this.token.asObservable().pipe(first(), flatMap(token => this.http.post('/recordings', payload, {
      headers: this.getHeaders(token),
    })));
  }

  getReport(recording: SavedRecording): Observable<string> {
    return this.token.asObservable().pipe(
      first(),
      concatMap(token => this.http.get(recording.reportUrl, {
        responseType: 'text',
        headers: this.getHeaders(token),
      })),
    );
  }

  private getHeaders(token?: string): HttpHeaders {
    let headers = new HttpHeaders();
    if (!!token) {
      headers = headers.append('Authorization', `Bearer ${token}`);
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
