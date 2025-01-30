/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Observable } from 'rxjs';
import { ApiService } from './Api.service';
import { LoginService } from './Login.service';
import { NotificationChannel } from './NotificationChannel.service';
import { ReportService } from './Report.service';
import { SettingsService } from './Settings.service';
import { TargetService } from './Target.service';
import { TargetsService } from './Targets.service';

export interface Services {
  target: TargetService;
  targets: TargetsService;
  reports: ReportService;
  api: ApiService;
  notificationChannel: NotificationChannel;
  settings: SettingsService;
  login: LoginService;
}

export interface CryostatContext {
  url: (path?: string) => Observable<string>;
  headers: (init?: HeadersInit) => Observable<Headers>;
}
