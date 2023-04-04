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

import { DashboardLayout, SerialDashboardLayout } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import { FileIcon, UserIcon } from '@patternfly/react-icons';
import { nanoid } from '@reduxjs/toolkit';
import React from 'react';
import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';

export const DEFAULT_DASHBOARD_NAME = 'Default';
export const DRAGGABLE_REF_KLAZZ = `draggable-ref`;
export const LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT = 100;

export const DashboardLayoutNamePattern = /^[a-zA-Z0-9_.-]+( [a-zA-Z0-9_.-]+)*$/;
export const LayoutTemplateDescriptionPattern = /^[a-zA-Z0-9\s\.,\-'";?!@#$%^&*()\[\]_+=:{}]*$/;

export enum LayoutTemplateIcon {
  CRYOSTAT = 'cryostat',
  BLANK = 'blank',
  USER = 'user',
}

export interface LayoutTemplate {
  name: string;
  icon: LayoutTemplateIcon;
  description: string;
  layout: SerialDashboardLayout;
  vendor?: 'Cryostat' | 'User-supplied';
}

export type SerialLayoutTemplate = Omit<LayoutTemplate, 'icon'| 'vendor'>;

export const iconify = (icon: LayoutTemplateIcon): React.ReactNode => {
  switch (icon) {
    case 'cryostat':
      return <img src={cryostatLogo} alt="Cryostat Logo" />;
    case 'blank':
      return <FileIcon style={{ paddingRight: '0.3rem' }} />;
    case 'user':
      return <UserIcon />;
    default:
      return <></>;
  }
};

export const templatize = (layout: DashboardLayout, name: string, desc?: string): LayoutTemplate => {
  return {
    name: name,
    icon: LayoutTemplateIcon.USER,
    description: desc || 'Custom layout.',
    layout: layout,
    vendor: 'User-supplied',
  };
};

export const deserializeLayout = (layout: SerialDashboardLayout, name?: string): DashboardLayout => {
  return {
    ...layout,
    name: name || layout.name,
    cards: layout.cards.map((card) => {
      return {
        ...card,
        id: `${card.name}-${nanoid()}`,
      };
    }),
  } as DashboardLayout;
};
