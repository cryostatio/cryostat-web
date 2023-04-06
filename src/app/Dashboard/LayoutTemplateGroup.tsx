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
import { dashboardConfigDeleteTemplateIntent } from '@app/Shared/Redux/ReduxStore';
import { CatalogTile, CatalogTileBadge } from '@patternfly/react-catalog-view-extension';
import {
  Dropdown,
  DropdownItem,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Gallery,
  GalleryItem,
  KebabToggle,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, PficonTemplateIcon } from '@patternfly/react-icons';
import React from 'react';
import { useDispatch } from 'react-redux';
import { BlankLayout } from './dashboard-templates';
import { iconify, LayoutTemplate } from './DashboardUtils';

export interface LayoutTemplateGroupProps {
  title: string;
  templates: LayoutTemplate[];
  onTemplateSelect: (templateName: LayoutTemplate) => void;
}

export const LayoutTemplateGroup: React.FC<LayoutTemplateGroupProps> = ({ onTemplateSelect, ...props }) => {
  const dispatch = useDispatch();
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>(BlankLayout.name);

  const handleTemplateSelect = React.useCallback(
    (template: LayoutTemplate) => {
      setSelectedTemplate(template.name);
      onTemplateSelect(template);
    },
    [setSelectedTemplate, onTemplateSelect]
  );

  const KebabCatalogTileBadge: React.FC<{ template: LayoutTemplate }> = ({ template }) => {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

    const onSelect = React.useCallback(
      (_ev) => {
        setIsOpen(false);
      },
      [setIsOpen]
    );

    const openKebab = React.useCallback(
      (value, e) => {
        e.stopPropagation();
        setIsOpen(value);
      },
      [setIsOpen]
    );

    const handleTemplateDelete = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(dashboardConfigDeleteTemplateIntent(template.name));
      },
      [template.name]
    );

    const dropdownItems = React.useMemo(() => {
      return [
        <DropdownItem key={template.name} onClick={handleTemplateDelete}>
          Delete
        </DropdownItem>,
      ];
    }, [template, handleTemplateDelete]);

    return (
      <Dropdown
        onSelect={onSelect}
        toggle={<KebabToggle isDisabled={template.vendor !== 'User-supplied'} onToggle={openKebab} />}
        isOpen={isOpen}
        isPlain
        dropdownItems={dropdownItems}
      />
    );
  };

  return (
    <>
      <Title headingLevel="h2" size="lg" style={{ padding: '1em' }}>
        {props.title}
      </Title>
      <Gallery className="layout-template-picker">
        {props.templates.length !== 0 ? (
          props.templates.map((template) => (
            <GalleryItem key={template.name}>
              <CatalogTile
                featured={selectedTemplate === template.name}
                id={template.name}
                key={template.name}
                icon={iconify(template.icon)}
                title={template.name}
                vendor={template.vendor}
                onClick={() => handleTemplateSelect(template)}
                badges={[
                  selectedTemplate === template.name && (
                    <CatalogTileBadge title="Selected" key={template.name}>
                      <CheckCircleIcon color={'var(--pf-global--success-color--100)'} />
                    </CatalogTileBadge>
                  ),
                  <KebabCatalogTileBadge template={template} key={template.name + '-kebab'} />,
                ]}
              >
                {template.description}
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
