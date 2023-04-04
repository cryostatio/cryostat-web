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
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { CatalogTile, CatalogTileBadge } from '@patternfly/react-catalog-view-extension';
import {
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Gallery,
  GalleryItem,
  SearchInput,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, PficonTemplateIcon } from '@patternfly/react-icons';
import { InnerScrollContainer, OuterScrollContainer } from '@patternfly/react-table';
import React from 'react';

import { useSelector } from 'react-redux';
import CryostatLayoutTemplates, { BlankLayout } from './dashboard-templates';
import { LayoutTemplate } from './DashboardUtils';
import { LayoutTemplateGroup } from './LayoutTemplateGroup';

export interface LayoutTemplatePickerProps {
  onTemplateSelect: (templateName: LayoutTemplate) => void;
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({ onTemplateSelect }) => {

  const recentTemplates: LayoutTemplate[] = useSelector((state: RootState) => state.dashboardConfigs.templateHistory);
  const userSubmittedTemplates: LayoutTemplate[] = useSelector((state: RootState) => state.dashboardConfigs.customTemplates);

  return (
    <OuterScrollContainer>
      <InnerScrollContainer>
        <Stack>
          <StackItem>
            <Toolbar isSticky>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput placeholder="Search templates" aria-label={"Search templates"} />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </StackItem>
          <StackItem>
            <LayoutTemplateGroup title="Suggested" templates={[BlankLayout, ...recentTemplates]} onTemplateSelect={onTemplateSelect} />
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
          <StackItem>
            <LayoutTemplateGroup title="Cryostat" templates={CryostatLayoutTemplates} onTemplateSelect={onTemplateSelect}  />
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
          <StackItem>
            <LayoutTemplateGroup title="User-submitted" templates={userSubmittedTemplates} onTemplateSelect={onTemplateSelect}  />
          </StackItem>
        </Stack>
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
};
