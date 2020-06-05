import { Observable, throwError } from 'rxjs';
import { combineLatest, concatMap, map, mergeMap } from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';
import { ApiService, Recording } from './Api.service';

export class ReportService {

  constructor(private api: ApiService) { }

  report(recording: Recording): Observable<string> {
    if (!recording?.reportUrl) {
      return throwError('No recording report URL');
    }
    return this.api.getToken()
      .pipe(
        combineLatest(this.api.getAuthMethod()),
        mergeMap(([token, authMethod]) => {
          return fromFetch(recording.reportUrl, {
            headers: new window.Headers({ 'Authorization': `${authMethod} ${token}` }),
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
          });
        }),
        concatMap(resp => {
          if (resp.ok) {
            return resp.blob();
          } else {
            throw new Error('Response not OK');
          }
        }),
        map(report => {
          const blob = new Blob([report], { type: 'text/html' });
          const objUrl = window.URL.createObjectURL(blob);
          return objUrl;
        })
      );
  }

}
