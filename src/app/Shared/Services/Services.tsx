import * as React from 'react';
import { NotificationsInstance } from '@app/Notifications/Notifications';
import { ApiService } from './Api.service';
import { CommandChannel } from './CommandChannel.service';
import { ReportService } from './Report.service';

export interface Services {
  api: ApiService;
  commandChannel: CommandChannel;
  reports: ReportService;
}

const api = new ApiService();
const commandChannel = new CommandChannel(api, NotificationsInstance);
const reports = new ReportService(api);

const defaultServices: Services = { api, commandChannel, reports };

const ServiceContext: React.Context<Services> = React.createContext(defaultServices);

export { ServiceContext, defaultServices };

