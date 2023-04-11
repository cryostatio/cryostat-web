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
import { gridSpans } from '@patternfly/react-core';
import { FileIcon, UserIcon } from '@patternfly/react-icons';
import { nanoid } from '@reduxjs/toolkit';
import React from 'react';

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
  USER = 'User-supplied',
}

export interface LayoutTemplate {
  name: string;
  description: string;
  cards: SerialCardConfig[];
  version: LayoutTemplateVersion;
  vendor: LayoutTemplateVendor;
}

export type SerialLayoutTemplate = Omit<LayoutTemplate, 'vendor'>;

export const mockSerialLayoutTemplate: SerialLayoutTemplate = {
  name: 'Default',
  description: 'Default.',
  cards: [] as SerialCardConfig[],
  version: LayoutTemplateVersion['v2.3'],
};

export interface LayoutTemplateProviderProps {
  selectedTemplate: LayoutTemplate | undefined;
  setSelectedTemplate: (template: React.SetStateAction<LayoutTemplate | undefined>) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (isOpen: React.SetStateAction<boolean>) => void;
}

// use a provider
export const LayoutTemplateContext = React.createContext<LayoutTemplateProviderProps>({
  selectedTemplate: undefined,
  setSelectedTemplate: () => undefined,
  isUploadModalOpen: false,
  setIsUploadModalOpen: () => undefined,
});

export const iconify = (vendor: LayoutTemplateVendor): React.ReactNode => {
  switch (vendor) {
    case LayoutTemplateVendor.CRYOSTAT:
      return <img src={cryostatLogo} alt="Cryostat Logo" />;
    case LayoutTemplateVendor.BLANK:
      return <FileIcon style={{ paddingRight: '0.3rem' }} />;
    case LayoutTemplateVendor.USER:
      return <UserIcon />;
    default:
      return <></>;
  }
};

export const templatize = (layout: DashboardLayout, name: string, desc?: string): LayoutTemplate => {
  return {
    name: name,
    description: desc || `Custom layout template.`,
    cards: layout.cards,
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

// replace with mock data preview
export const cardsToString = (config: SerialCardConfig[]): string => {
  if (config.length === 0) {
    return 'None';
  }
  return config
    .map((card) => {
      // map in chartKind if it exists
      let stringified = card.name;
      if (card.props.hasOwnProperty('chartKind')) {
        stringified += `(${card.props['chartKind']})`;
      }
      return stringified;
    })
    .join(', ');
};
