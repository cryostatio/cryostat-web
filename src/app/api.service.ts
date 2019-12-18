import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable, ReplaySubject, ObservableInput, of } from 'rxjs';
import { filter, first, map, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class ApiService {

  private readonly token = new ReplaySubject<string>();

  constructor(
    private http: HttpClient,
  ) {  }

  checkAuth(token: string): Observable<boolean> {
    let headers = {};
    if (!!token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.http.post('/auth', null, { headers })
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

}
