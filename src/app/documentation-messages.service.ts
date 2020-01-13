import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NotificationService, NotificationType } from 'patternfly-ng';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DocumentationMessagesService {

  private messages: Map<string, string>;
  private readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private notifications: NotificationService,
  ) {
    this.setLocale(navigator.language);
  }

  setLocale(locale: string = navigator.language) {
    const languages = navigator.languages.filter((v) => v !== locale);
    languages.unshift(locale);
    const locales = [];
    languages.forEach(lang => {
      if (lang.indexOf('-') === -1) {
        locales.push(lang);
      } else {
        locales.push(lang);
        locales.push(lang.split('-')[0]);
      }
    });
    const range = locales.map((v, i) => {
      if (i > 10) {
        i = 10;
      }
      return `${v};q=${1 - i * 0.1}`;
    }).join(',');


    this.ready.next(false);
    this.http.get('/documentation_messages', {
      headers: {
        'Accepted-Language': range
      }
    }).subscribe(
      (dictionary: object) => {
        this.messages = new Map(Object.entries(dictionary));
        this.ready.next(true);
      },
      (res: HttpErrorResponse) => {
        this.notifications.message(NotificationType.WARNING,
          'Failed to fetch documentation messages', res.error.message, false, null, null);
      }
    );
  }

  isReady(): Observable<boolean> {
    return this.ready.asObservable();
  }

  getMessage(key: string): Observable<string> {
    return this.ready.asObservable().pipe(
      filter((v, i) => v),
      map((v, i) => this.messages.get(key))
    );
  }
}
