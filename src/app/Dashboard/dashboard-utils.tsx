/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';
import cryostatLogoDark from '@app/assets/cryostat_icon_rgb_reverse.svg';
import { dashboardConfigDeleteCardIntent } from '@app/Shared/Redux/ReduxStore';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { withThemedIcon } from '@app/utils/withThemedIcon';
import { LabelProps, gridSpans, Button, ButtonVariant } from '@patternfly/react-core';
import { FileIcon, UnknownIcon, UserIcon } from '@patternfly/react-icons';
import { nanoid } from '@reduxjs/toolkit';
import { TFunction } from 'i18next';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Observable } from 'rxjs';
import { AutomatedAnalysisCardDescriptor } from './AutomatedAnalysis/AutomatedAnalysisCard';
import { JFRMetricsChartCardDescriptor } from './Charts/jfr/JFRMetricsChartCard';
import { MBeanMetricsChartCardDescriptor } from './Charts/mbean/MBeanMetricsChartCard';
import { JvmDetailsCardDescriptor } from './JvmDetails/JvmDetailsCard';

export const DEFAULT_DASHBOARD_NAME = 'Default';
export const DRAGGABLE_REF_KLAZZ = `draggable-ref`;
export const LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT = 100;

export const DashboardLayoutNamePattern = /^[a-zA-Z0-9_.-]+( [a-zA-Z0-9_.-]+)*$/;
export const LayoutTemplateDescriptionPattern = /^[a-zA-Z0-9\s.,\-'";?!@#$%^&*()[\]_+=:{}]*$/;

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

export const mockSerialLayoutTemplate: SerialLayoutTemplate = {
  name: 'Default',
  description: 'Default.',
  cards: [] as SerialCardConfig[],
  version: LayoutTemplateVersion['v2.3'],
};

export type LayoutTemplateFilter = 'Suggested' | 'Cryostat' | 'User-submitted';

export interface LayoutTemplateController {
  selectedTemplate: SelectedLayoutTemplate | undefined;
  setSelectedTemplate: (template: React.SetStateAction<SelectedLayoutTemplate | undefined>) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (isOpen: React.SetStateAction<boolean>) => void;
}

// use a provider
export const LayoutTemplateContext = React.createContext<LayoutTemplateController>({
  selectedTemplate: undefined,
  setSelectedTemplate: () => undefined,
  isUploadModalOpen: false,
  setIsUploadModalOpen: () => undefined,
});

export const iconify = (vendor: LayoutTemplateVendor): React.ReactNode => {
  switch (vendor) {
    case LayoutTemplateVendor.CRYOSTAT:
      return <ThemedCryostatLogo />;
    case LayoutTemplateVendor.BLANK:
      return <FileIcon style={{ paddingRight: '0.3rem' }} />;
    case LayoutTemplateVendor.USER:
      return <UserIcon />;
    default:
      return <UnknownIcon />;
  }
};

export const ThemedCryostatLogo = withThemedIcon(cryostatLogo, cryostatLogoDark, 'Cryostat Logo');

export const templatize = (layout: DashboardLayout, name: string, desc?: string): LayoutTemplate => {
  return {
    name: name,
    description: desc || `Custom layout template.`,
    cards: layout.cards.map((card) => {
      const { id: _id, ...cardWithoutId } = card;
      return { ...cardWithoutId };
    }) as SerialCardConfig[],
    vendor: LayoutTemplateVendor.USER,
    version: LayoutTemplateVersion['v2.3'],
  } as LayoutTemplate;
};

export const layoutize = (template: LayoutTemplate, name: string): DashboardLayout => {
  return {
    name: name,
    cards: template.cards.map((card) => {
      return {
        ...card,
        id: `${card.name}-${nanoid()}`,
      };
    }),
    favorite: false,
  } as DashboardLayout;
};

export const recordToLayoutTemplate = (
  record: LayoutTemplateRecord,
  allTemplates: LayoutTemplate[]
): LayoutTemplate | undefined => {
  return allTemplates.find((template) => template.name === record.name && template.vendor === record.vendor);
};

export const getUniqueIncrementingName = (init = 'Custom', names: string[]): string => {
  let name: string;
  let i = 1;
  do {
    name = `${init}${i}`;
    i++;
  } while (names.includes(name));
  return name;
};

export function hasCardDescriptorByName(name: string): boolean {
  for (const choice of getDashboardCards()) {
    if (choice.component.name === name) {
      return true;
    }
  }
  return false;
}

export function getCardDescriptorByName(name: string): DashboardCardDescriptor {
  for (const choice of getDashboardCards()) {
    if (choice.component.name === name) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${name}`);
}

export function hasCardDescriptorByTitle(title: string, t: TFunction): boolean {
  for (const choice of getDashboardCards()) {
    if (t(choice.title) === title) {
      return true;
    }
  }
  return false;
}

export function getCardDescriptorByTitle(title: string, t: TFunction): DashboardCardDescriptor {
  for (const choice of getDashboardCards()) {
    if (t(choice.title) === title) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${title}`);
}

export const getDashboardCards: (featureLevel?: FeatureLevel) => DashboardCardDescriptor[] = (
  featureLevel = FeatureLevel.DEVELOPMENT
) => {
  const cards = [
    JvmDetailsCardDescriptor,
    AutomatedAnalysisCardDescriptor,
    JFRMetricsChartCardDescriptor,
    MBeanMetricsChartCardDescriptor,
  ];
  return cards.filter((card) => card.featureLevel >= featureLevel);
};

interface ValidationError {
  message: React.ReactNode;
}

export interface CardValidationResult {
  errors: ValidationError[];
  callForAction?: React.ReactNode;
}

export const RemoveCardAction: React.FC<{ cardIndex: number }> = ({ cardIndex }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleClick = React.useCallback(() => {
    dispatch(dashboardConfigDeleteCardIntent(cardIndex));
  }, [dispatch, cardIndex]);

  return (
    <Button onClick={handleClick} variant={ButtonVariant.danger}>
      {t('REMOVE', { ns: 'common' })}
    </Button>
  );
};

export const validateCardConfig = ({ name, props }: CardConfig, cardIndex: number): CardValidationResult => {
  // Unsupported card type
  if (!hasCardDescriptorByName(name)) {
    return {
      errors: [
        {
          message: (
            <>
              Unknown card type: <code>{name}</code>.
            </>
          ),
        },
      ],
      callForAction: <RemoveCardAction cardIndex={cardIndex} />,
    };
  }

  const errs: ValidationError[] = [];

  const { propControls } = getCardDescriptorByName(name);
  const configPropKeys = Object.entries(props);

  // Missing props
  propControls
    .map((ctrl) => ctrl.key)
    .forEach((propKey) => {
      const matched = configPropKeys.find(([key, _]) => key === propKey);
      if (!matched) {
        errs.push({
          message: (
            <>
              Missing card property: <code>{propKey}</code>.
            </>
          ),
        });
      }
    });

  // Invalid prop valies
  configPropKeys.forEach(([propKey, propValue]) => {
    const matched = propControls.find((crtl) => crtl.key === propKey);
    if (matched) {
      const { values, extras } = matched;
      // FIXME: Check dynamic values
      let err: ValidationError | undefined;
      if (propValue === undefined || propValue === null) {
        err = {
          message: (
            <>
              Undefined value for card property: <code>{propKey}</code>
            </>
          ),
        };
      } else if (values && Array.isArray(values) && !values.some((v) => v === propValue)) {
        err = {
          message: (
            <>
              Invalid value <code>{propValue}</code> for card property: <code>{propKey}</code>.
            </>
          ),
        };
      } else if (extras) {
        const valAsNum = Number(propValue);
        if (isNaN(valAsNum)) {
          err = {
            message: (
              <>
                Numeric value expected but <code>{typeof propValue}</code> was given for: <>{propKey}</>.
              </>
            ),
          };
        } else {
          if (
            (extras.min !== undefined && valAsNum < extras.min) ||
            (extras.max !== undefined && valAsNum > extras.max)
          ) {
            err = {
              message: (
                <>
                  Value exceeding limit for card property: <code>{propKey}</code>.
                </>
              ),
            };
          }
        }
      }
      err && errs.push(err);
    }
    // Unknown props are ignored
  });

  return {
    errors: errs,
    callForAction: errs.length ? <RemoveCardAction cardIndex={cardIndex} /> : undefined,
  };
};

/* CARD SECTION */
export interface Sized<T> {
  minimum: T;
  default: T;
  maximum: T;
}

export interface DashboardCardSizes {
  span: Sized<gridSpans>;
  height: Sized<number>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  component: React.FC<any>;
  propControls: PropControl[];
  advancedConfig?: JSX.Element;
}

export interface PropControlExtra {
  min?: number;
  max?: number;
  [key: string]: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface PropControl {
  name: string;
  key: string;
  description: string;
  kind: 'boolean' | 'number' | 'string' | 'text' | 'select';
  values?: any[] | Observable<any>;
  defaultValue: any;
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
