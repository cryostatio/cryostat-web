import { Observable, of, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { combineLatest, concatMap, map, mergeMap, tap } from 'rxjs/operators';
import { ApiService, isActiveRecording, RecordingState, SavedRecording } from './Api.service';

export class ReportService {

  private readonly reports: Map<SavedRecording, string> = new Map();

  constructor(private api: ApiService) { }

  report(recording: SavedRecording): Observable<string> {
    if (!recording?.reportUrl) {
      return throwError('No recording report URL');
    }
    if (this.reports.has(recording)) {
      return of(this.reports.get(recording) || '');
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
            return resp.text();
          } else {
            throw new Error('Response not OK');
          }
        }),
        tap(report => {
          const isArchived = !isActiveRecording(recording);
          const isActivedStopped = isActiveRecording(recording) && recording.state === RecordingState.STOPPED;
          if (isArchived || isActivedStopped) {
            this.reports.set(recording, report);
          }
        })
      );
  }

}
