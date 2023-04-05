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
import { RootState } from '@app/Shared/Redux/ReduxStore';
import useDayjs from '@app/utils/useDayjs';
import { portalRoot } from '@app/utils/utils';
import { PropertiesSidePanel, PropertyItem } from '@patternfly/react-catalog-view-extension';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  SearchInput,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, GlobeIcon } from '@patternfly/react-icons';
import { InnerScrollContainer, OuterScrollContainer } from '@patternfly/react-table';
import React from 'react';

import { useSelector } from 'react-redux';
import CryostatLayoutTemplates, { BlankLayout } from './dashboard-templates';
import { LayoutTemplate } from './DashboardUtils';
import { LayoutTemplateGroup } from './LayoutTemplateGroup';

export type LayoutTemplateFilter = 'Suggested' | 'Cryostat' | 'User-submitted';

export interface LayoutTemplatePickerProps {
  onTemplateSelect: (templateName: LayoutTemplate) => void;
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({ onTemplateSelect }) => {
  const [searchFilter, setSearchFilter] = React.useState('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);
  const [selectedFilters, setSelectedFilters] = React.useState<LayoutTemplateFilter[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<LayoutTemplate | undefined>(undefined);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [dayjs, timeFormat] = useDayjs();
  const recentTemplates: LayoutTemplate[] = useSelector((state: RootState) => state.dashboardConfigs.templateHistory);
  const userSubmittedTemplates: LayoutTemplate[] = useSelector((state: RootState) => state.dashboardConfigs.customTemplates);

  const onSearchChange = React.useCallback(
    (_ev, value) => {
      setSearchFilter(value);
    },
    [setSearchFilter],
  );

  const onDeleteChip = React.useCallback((_category: string, chip: string) => {
    setSelectedFilters((prev) => prev.filter((item) => item !== chip));
  }, [setSelectedFilters]);

  const onFilterSelect = React.useCallback(
    (_ev: React.MouseEvent | React.ChangeEvent, selection: string | SelectOptionObject, isPlaceholder: boolean | undefined) => {
      const selected = selection as LayoutTemplateFilter;
      setSelectedFilters((prev) => {
        if (isPlaceholder) {
          return [];
        }
        if (prev.includes(selected)) {
          return prev.filter((item) => item !== selected);
        }
        return [...prev, selected];
      });
    },
    [setSelectedFilters],
  );

  const onInnerTemplateSelect = React.useCallback(
    (templateName: LayoutTemplate) => {
      onTemplateSelect(templateName);
      setSelectedTemplate(templateName);
      setIsDrawerExpanded(true);
    },
    [onTemplateSelect, setSelectedTemplate, setIsDrawerExpanded],
  );

  const onFilterSelectToggle = React.useCallback((isExpanded: boolean) => {
    setIsFilterSelectOpen(isExpanded);
  }, [setIsFilterSelectOpen]);

  const onClearAllFilters = React.useCallback(() => {
    setSelectedFilters([]);
    setSearchFilter('');
  }, [setSelectedFilters, setSearchFilter]);

  const onDrawerCloseClick = React.useCallback(() => {
    setIsDrawerExpanded(false);
  }, [setIsDrawerExpanded]);

  const panelContent = React.useMemo(() => {
    return (
      <DrawerPanelContent>
        <DrawerHead>
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.name}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.description}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Vendor</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.vendor}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Card List</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.layout.cards.toString()}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Version</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.version}</DescriptionListDescription>
              </DescriptionListGroup>
              {
              selectedTemplate?.createdAt &&
                <DescriptionListGroup>
                <DescriptionListTerm>Created At</DescriptionListTerm>
                <DescriptionListDescription>{dayjs(selectedTemplate.createdAt).tz(timeFormat.timeZone.full).format('LL')}</DescriptionListDescription>
              </DescriptionListGroup>}
            </DescriptionList>
          <DrawerActions>
            <DrawerCloseButton onClick={onDrawerCloseClick} />
          </DrawerActions>
        </DrawerHead>
      </DrawerPanelContent>
    );
  }, [dayjs, onDrawerCloseClick, selectedTemplate]);
  
  return (
        <Drawer isExpanded={isDrawerExpanded} isInline position="right">
          <DrawerContent panelContent={panelContent}>
            <DrawerContentBody>
            <OuterScrollContainer>
            <InnerScrollContainer>
              <Toolbar isSticky clearAllFilters={onClearAllFilters}>
                <ToolbarContent>
                  <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint={"md"}>
                    <ToolbarItem variant="search-filter">
                      <SearchInput placeholder="Search templates" aria-label={"Search templates"} value={searchFilter} onChange={onSearchChange} />
                    </ToolbarItem>
                    <ToolbarGroup variant="filter-group">
                      <ToolbarFilter
                        chips={selectedFilters}
                        deleteChip={onDeleteChip}
                        categoryName="Category"
                      >
                        <Select
                          menuAppendTo={portalRoot}
                          variant={SelectVariant.checkbox}
                          aria-label="Select template category"
                          onToggle={onFilterSelectToggle}
                          onSelect={onFilterSelect}
                          selections={selectedFilters}
                          isOpen={isFilterSelectOpen}
                          placeholderText="Template Type"
                        >
                            <SelectOption key="suggested" value="Suggested" />
                            <SelectOption key="cryostat" value="Cryostat" />
                            <SelectOption key="user-submitted" value="User-submitted" />
                        </Select>
                      </ToolbarFilter>
                    </ToolbarGroup>
                  </ToolbarToggleGroup>
                </ToolbarContent>
              </Toolbar>
              <Stack>
                {
                  (selectedFilters.includes('Suggested') || selectedFilters.length === 0) &&
                  <>
                    <StackItem >
                      <LayoutTemplateGroup title="Suggested" templates={[BlankLayout, ...recentTemplates]} onTemplateSelect={onInnerTemplateSelect} />
                    </StackItem>
                    <StackItem>
                      <Divider />
                    </StackItem>
                  </>
                }
                {
                  (selectedFilters.includes('Cryostat') || selectedFilters.length === 0) &&
                  <>
                    <StackItem>
                      <LayoutTemplateGroup title="Cryostat" templates={CryostatLayoutTemplates} onTemplateSelect={onInnerTemplateSelect}  />
                    </StackItem>
                    <StackItem>
                      <Divider />
                    </StackItem>
                  </>
                }
                {
                  (selectedFilters.includes('User-submitted') || selectedFilters.length === 0) &&
                  <StackItem>
                    <LayoutTemplateGroup title="User-submitted" templates={userSubmittedTemplates} onTemplateSelect={onInnerTemplateSelect}  />
                  </StackItem>
                }
              </Stack>
              </InnerScrollContainer>
    </OuterScrollContainer>
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
  
  );
};
