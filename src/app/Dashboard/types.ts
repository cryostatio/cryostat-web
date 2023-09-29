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
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { gridSpans, LabelProps } from '@patternfly/react-core';
import { Observable } from 'rxjs';

export interface Sized<T> {
  minimum: T;
  default: T;
  maximum: T;
}

export interface DashboardCardSizes {
  span: Sized<gridSpans>;
  height: Sized<number>;
}

export interface DashboardCardDescriptor {
  featureLevel: FeatureLevel;
  icon?: React.ReactNode;
  labels?: {
    content: string;
    color?: LabelProps['color'];
    icon?: React.ReactNode;
  }[];
  preview?: React.ReactNode;
  title: string;
  cardSizes: DashboardCardSizes;
  description: string;
  descriptionFull: JSX.Element | string;
  component: DashboardCardFC<DashboardCardTypeProps>;
  propControls: PropControl[];
  advancedConfig?: JSX.Element;
}
export type DashboardCardFC<P> = React.FC<P> & {
  cardComponentName: string;
};

export interface PropControlExtra {
  displayMapper?: (value: string) => string /* only has effect with 'select' PropControl kind */;
  min?: number;
  max?: number;
  [key: string]: unknown;
}

export interface PropControl {
  name: string;
  key: string;
  description: string;
  kind: 'boolean' | 'number' | 'string' | 'text' | 'select';
  values?: unknown[] | Observable<unknown>;
  defaultValue: unknown;
  extras?: PropControlExtra;
}

export interface DashboardCardTypeProps {
  span: number;
  dashboardId: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  isFullHeight?: boolean;
  actions?: JSX.Element[];
}

export interface ValidationError {
  message: React.ReactNode;
}

export interface CardValidationResult {
  errors: ValidationError[];
  callForAction?: React.ReactNode;
}

export type LayoutTemplateFilter = 'Suggested' | 'Cryostat' | 'User-submitted';

export interface LayoutTemplateController {
  selectedTemplate: SelectedLayoutTemplate | undefined;
  setSelectedTemplate: (template: React.SetStateAction<SelectedLayoutTemplate | undefined>) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (isOpen: React.SetStateAction<boolean>) => void;
}

export interface CardConfig {
  id: string;
  name: string;
  span: gridSpans;
  props: object;
}

export type SerialCardConfig = Omit<CardConfig, 'id'>;

export const mockSerialCardConfig: SerialCardConfig = {
  name: 'Default',
  span: 12,
  props: {},
};
export interface DashboardLayout {
  name: string;
  cards: CardConfig[];
  favorite: boolean;
}

export type SerialDashboardLayout = Omit<DashboardLayout, 'name' | 'cards'> & { cards: SerialCardConfig[] };

// only name and vendor are needed to identify a template
export type LayoutTemplateRecord = Pick<LayoutTemplate, 'name' | 'vendor'>;

export enum LayoutTemplateVersion {
  'v2.3' = 'v2.3',
  'v2.4' = 'v2.4',
}

export enum LayoutTemplateVendor {
  BLANK = 'Blank',
  CRYOSTAT = 'Cryostat',
  USER = 'User-submitted',
}

export interface LayoutTemplate {
  name: string;
  description: string;
  cards: SerialCardConfig[];
  version: LayoutTemplateVersion;
  vendor: LayoutTemplateVendor;
}

export interface SelectedLayoutTemplate {
  template: LayoutTemplate;
  category: LayoutTemplateFilter;
}

export type SerialLayoutTemplate = Omit<LayoutTemplate, 'vendor'>;
