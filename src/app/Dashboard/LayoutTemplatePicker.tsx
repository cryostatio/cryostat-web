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
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, PficonTemplateIcon } from '@patternfly/react-icons';
import { InnerScrollContainer, OuterScrollContainer } from '@patternfly/react-table';
import React from 'react';

import { useSelector } from 'react-redux';
import CryostatLayoutTemplates, { BlankLayout } from './dashboard-templates';
import { LayoutTemplate } from './DashboardUtils';

export interface LayoutTemplatePickerProps {
  onTemplateSelect: (templateName: LayoutTemplate) => void;
}

export interface LayoutTemplateGroupProps {
  title: string;
  templates: LayoutTemplate[];
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({ onTemplateSelect }) => {
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>(BlankLayout.name);

  const recentTemplates: LayoutTemplate[] = useSelector((state: RootState) => state.dashboardConfigs.templateHistory);
  const userSubmittedTemplates: LayoutTemplate[] = useSelector((state: RootState) => state.dashboardConfigs.customTemplates);

  const handleTemplateSelect = React.useCallback(
    (template: LayoutTemplate) => {
      setSelectedTemplate(template.name);
      onTemplateSelect(template);
    },
    [setSelectedTemplate, onTemplateSelect]
  );

  const LayoutTemplateGroup: React.FC<LayoutTemplateGroupProps> = (props) => {
    return (
      <>
        <Title headingLevel="h2" size="lg" style={{ padding: '1em' }}>
          {props.title}
        </Title>
        <Gallery hasGutter={true} className="layout-template-picker">
          {props.templates.length !== 0 ? (
            props.templates.map((layout) => (
              <GalleryItem key={layout.name}>
                <CatalogTile
                  featured={selectedTemplate === layout.name}
                  id={layout.name}
                  key={layout.name}
                  icon={typeof layout.icon === 'string' ? undefined : layout.icon}
                  iconImg={typeof layout.icon === 'string' ? layout.icon : undefined}
                  iconAlt={'Cryostat Logo'}
                  title={layout.name}
                  vendor={layout.vendor}
                  onClick={() => handleTemplateSelect(layout)}
                  badges={[
                    <CatalogTileBadge title="Selected" key={layout.name}>
                      {selectedTemplate === layout.name && (
                        <CheckCircleIcon color={'var(--pf-global--success-color--100)'} />
                      )}
                    </CatalogTileBadge>,
                  ]}
                >
                  {layout.description}
                </CatalogTile>
              </GalleryItem>
            ))
          ) : (
            <EmptyState>
              <EmptyStateIcon icon={PficonTemplateIcon} />
              <Title size="lg" headingLevel="h4">
                No templates found
              </Title>
              <EmptyStateBody>Upload your own templates!</EmptyStateBody>
            </EmptyState>
          )}
        </Gallery>
      </>
    );
  };

  return (
    <OuterScrollContainer>
      <InnerScrollContainer>
        <Stack>
          <StackItem>
            <LayoutTemplateGroup title="Suggested" templates={[BlankLayout, ...recentTemplates]} />
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
          <StackItem>
            <LayoutTemplateGroup title="Cryostat" templates={CryostatLayoutTemplates} />
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
          <StackItem>
            <LayoutTemplateGroup title="User-submitted" templates={userSubmittedTemplates} />
          </StackItem>
        </Stack>
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
};
