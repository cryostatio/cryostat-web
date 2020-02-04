import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NotificationService, NotificationType } from 'patternfly-ng';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {

  private messages: Map<string, string>;
  private readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private notifications: NotificationService,
  ) {
    this.setLocale(navigator.language); // use the UA language by default
  }

  setLocale(locale: string) {
    this.ready.next(false);
    this.http.get('/localization', {
      headers: {
        'Accepted-Language': this.buildAcceptedLanguage(locale)
      }
    }).subscribe(
      (dictionary: object) => {
        this.messages = new Map(Object.entries(dictionary));
        this.ready.next(true);
      },
      (res: HttpErrorResponse) => {
        this.notifications.message(NotificationType.WARNING,
          'Failed to fetch localization messages', res.error.message, false, null, null);
      }
    );
  }

  private buildAcceptedLanguage(locale: string): string {
    const languages = navigator.languages.filter((v) => v !== locale).filter((v) => v !== locale);
    languages.unshift(locale); // ordered by priority

    // Include base languages as fallback. eg. en-US => en-US, en
    const locales = [];
    languages.forEach(lang => {
      if (lang.indexOf('-') === -1) {
        locales.push(lang);
      } else {
        locales.push(lang);
        locales.push(lang.split('-')[0]);
      }
    });

    // Append q-factor weights, randing from 0 to 1 inclusive with 1 being the highest priority, to each locale. See RFC-7231#5.3.5
    return locales
      .filter((v, i) => locales.indexOf(v) === i) // remove duplicates
      .map((l, i) => {
        const q = 1 - i * 0.1;
        if (q === 1) {
          return l; // ';q=1' can be omitted
        } else if (q <= 0) {
          return l + ';q=0';
        } else {
          return l + `;q=` + q;
        }
      }).join(',');
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
