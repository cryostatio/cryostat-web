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
import { Notifications } from '@app/Notifications/Notifications';
import { Services } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { LabelProps } from '@patternfly/react-core';
import * as React from 'react';
import { useHistory } from 'react-router-dom';

export interface ActionUtils {
  history: ReturnType<typeof useHistory>;
  services: Services;
  notifications: Notifications;
}

export interface QuickSearchItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  labels?: {
    content: string;
    color?: LabelProps['color'];
    icon?: React.ReactNode;
  }[];
  descriptionShort?: string;
  descriptionFull?: string;
  featureLevel: FeatureLevel;
  disabled?: boolean;
  actionText?: React.ReactNode;
  createAction?: (utils: ActionUtils) => void;
}
