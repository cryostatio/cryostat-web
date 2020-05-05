import * as React from 'react';
import { ApiService } from './Api.service';
import { CommandChannel } from './CommandChannel.service';
import { NotificationsInstance } from '@app/Notifications/Notifications';

export interface Services {
  api: ApiService;
  commandChannel: CommandChannel;
}

const api = new ApiService();
const commandChannel = new CommandChannel(api, NotificationsInstance);
export const defaultServices: Services = { api, commandChannel };

export const ServiceContext: React.Context<Services> = React.createContext(defaultServices);
