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
import * as React from 'react';
import { Observable } from 'rxjs';
import { ApiService } from './Api.service';
import { LoginService } from './Login.service';
import { NotificationChannel } from './NotificationChannel.service';
import { ReportService } from './Report.service';
import { SettingsService } from './Settings.service';
import { TargetService } from './Target.service';
import { TargetsService } from './Targets.service';

interface Services {
  target: TargetService;
  targets: TargetsService;
  reports: ReportService;
  api: ApiService;
  notificationChannel: NotificationChannel;
  settings: SettingsService;
  login: LoginService;
}

interface CryostatContext {
  url: (path?: string) => Observable<string>;
  headers: (init?: HeadersInit) => Observable<Headers>;
}

// do not supply a default context value on purpose. We only intend to use the context with a Provider
// within a render tree, but we do not want to instantiate default implementations until we know some
// runtime information like the URL of the server we should communicate with.
const ServiceContext: React.Context<Services> = React.createContext<Services>(undefined as never);

export { Services, CryostatContext, ServiceContext };
