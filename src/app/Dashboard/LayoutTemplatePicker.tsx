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
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { fakeChartContext, fakeServices } from '@app/utils/fakeData';
import { portalRoot } from '@app/utils/utils';
import {
  Button,
  Card,
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
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Grid,
  GridItem,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import {
  ArrowsAltVIcon,
  FilterIcon,
  GlobeIcon,
  LongArrowAltDownIcon,
  LongArrowAltUpIcon,
  PficonTemplateIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import { InnerScrollContainer, OuterScrollContainer } from '@patternfly/react-table';
import React from 'react';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { ChartContext } from './Charts/ChartContext';
import { JFRMetricsChartCardDescriptor } from './Charts/jfr/JFRMetricsChartCard';
import { getConfigByName, hasConfigByName } from './Dashboard';
import CryostatLayoutTemplates, { BlankLayout } from './dashboard-templates';
import {
  LayoutTemplate,
  LayoutTemplateContext,
  LayoutTemplateRecord,
  recordToLayoutTemplate,
} from './DashboardUtils';
import { LayoutTemplateGroup } from './LayoutTemplateGroup';
import { SearchAutocomplete } from './SearchAutocomplete';

export type LayoutTemplateFilter = 'Suggested' | 'Cryostat' | 'User-submitted';

export type LayoutTemplateSort = 'Name' | 'Card Count'; // TODO: add 'Version' after more version are released

const TemplateSortSelectOption: React.FC<{ sort: LayoutTemplateSort }> = ({ sort }) => {
  return <SelectOption key={sort} value={sort} />;
};
export interface LayoutTemplatePickerProps {
  onTemplateSelect: (templateName: LayoutTemplate) => void;
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({ onTemplateSelect }) => {
  const { selectedTemplate, setSelectedTemplate, setIsUploadModalOpen } = React.useContext(LayoutTemplateContext);

  const [searchFilter, setSearchFilter] = React.useState('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [selectedFilters, setSelectedFilters] = React.useState<LayoutTemplateFilter[]>([]);

  const [isSortSelectOpen, setIsSortSelectOpen] = React.useState(false);
  const [selectedSort, setSelectedSort] = React.useState<LayoutTemplateSort | undefined>(undefined);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const { t } = useTranslation();
  const recentTemplateRecords: LayoutTemplateRecord[] = useSelector(
    (state: RootState) => state.dashboardConfigs.templateHistory
  );
  const userSubmittedTemplates: LayoutTemplate[] = useSelector(
    (state: RootState) => state.dashboardConfigs.customTemplates
  );

  const searchFilteredTemplates = React.useCallback(
    (templates: LayoutTemplate[]): LayoutTemplate[] => {
      if (!searchFilter) {
        return templates;
      }
      return templates.filter((t) => t.name.toLowerCase().includes(searchFilter.toLowerCase()));
    },
    [searchFilter]
  );

  const allTemplates: LayoutTemplate[] = React.useMemo(() => {
    return [BlankLayout, ...userSubmittedTemplates, ...CryostatLayoutTemplates];
  }, [userSubmittedTemplates]);

  const allSearchableTemplateNames: string[] = React.useMemo(() => {
    return searchFilteredTemplates(
      allTemplates.filter((template, index, arr) => arr.findIndex((t) => t.name === template.name) === index)
    ).map((t) => t.name);
  }, [searchFilteredTemplates, allTemplates]);

  const onInnerTemplateSelect = React.useCallback(
    (template: LayoutTemplate) => {
      onTemplateSelect(template);
      setSelectedTemplate(template);
      setIsDrawerExpanded(true);
    },
    [onTemplateSelect, setSelectedTemplate, setIsDrawerExpanded]
  );

  const onInnerTemplateDelete = React.useCallback(
    (templateName: string) => {
      setSelectedTemplate((prev) => {
        if (prev?.name === templateName) {
          return undefined;
        }
        return prev;
      });
    },
    [setSelectedTemplate]
  );

  const handleUploadButton = React.useCallback(() => {
    setIsUploadModalOpen(true);
  }, [setIsUploadModalOpen]);

  const uploadButton = React.useMemo(
    () => (
      <Button
        key="upload"
        variant="secondary"
        aria-label={t('DashboardLayoutToolbar.UPLOAD.LABEL')}
        onClick={handleUploadButton}
        icon={<UploadIcon />}
        data-quickstart-id="dashboard-upload-btn"
      >
        {t('UPLOAD', { ns: 'common' })}
      </Button>
    ),
    [t, handleUploadButton]
  );

  // const downloadButton = React.useMemo(
  //   () => (
  //     <Button
  //       key="download"
  //       variant="secondary"
  //       aria-label={t('DashboardLayoutToolbar.DOWNLOAD.LABEL')}
  //       onClick={handleDownloadLayout}
  //       icon={<DownloadIcon />}
  //       data-quickstart-id="dashboard-download-btn"
  //     >
  //       {t('DOWNLOAD', { ns: 'common' })}
  //     </Button>
  //   ),
  //   [t, handleDownloadLayout]
  // );

  const onSearchChange = React.useCallback(
    (value: string) => {
      setSearchFilter(value);
    },
    [setSearchFilter]
  );

  const onDeleteChip = React.useCallback(
    (_category: string, chip: string) => {
      setSelectedFilters((prev) => prev.filter((item) => item !== chip));
    },
    [setSelectedFilters]
  );

  const onFilterSelect = React.useCallback(
    (
      _ev: React.MouseEvent | React.ChangeEvent,
      selection: string | SelectOptionObject,
      isPlaceholder: boolean | undefined
    ) => {
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
    [setSelectedFilters]
  );

  const onFilterSelectToggle = React.useCallback(
    (isExpanded: boolean) => {
      setIsFilterSelectOpen(isExpanded);
    },
    [setIsFilterSelectOpen]
  );

  const onClearAllFilters = React.useCallback(() => {
    setSelectedFilters([]);
  }, [setSelectedFilters]);

  const onSortSelectToggle = React.useCallback(
    (isExpanded: boolean) => {
      setIsSortSelectOpen(isExpanded);
    },
    [setIsSortSelectOpen]
  );

  const onSortSelect = React.useCallback(
    (
      _ev: React.MouseEvent | React.ChangeEvent,
      selection: string | SelectOptionObject,
      isPlaceholder: boolean | undefined
    ) => {
      const selected = selection as LayoutTemplateSort;
      setSelectedSort((_prev) => {
        if (isPlaceholder) {
          return undefined;
        }
        return selected;
      });
      setIsSortSelectOpen(false);
    },
    [setSelectedSort, setIsSortSelectOpen]
  );

  const sortArrowIcon = React.useMemo(() => {
    if (!selectedSort) {
      return <ArrowsAltVIcon />;
    }
    return sortDirection === 'asc' ? <LongArrowAltUpIcon /> : <LongArrowAltDownIcon />;
  }, [selectedSort, sortDirection]);

  const onSortDirectionChange = React.useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, [setSortDirection]);

  const onDrawerCloseClick = React.useCallback(() => {
    setIsDrawerExpanded(false);
  }, [setIsDrawerExpanded]);

  const panelContent = React.useMemo(() => {
    return (
      <DrawerPanelContent isResizable defaultSize="25%">
        <DrawerHead>
          {selectedTemplate ? (
            <DescriptionList isFillColumns>
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.name}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>{selectedTemplate?.description}</DescriptionListDescription>
              </DescriptionListGroup>
              {selectedTemplate?.vendor && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Vendor</DescriptionListTerm>
                  <DescriptionListDescription>{selectedTemplate.vendor}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {selectedTemplate?.version && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Version</DescriptionListTerm>
                  <DescriptionListDescription>{selectedTemplate.version}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>Card List</DescriptionListTerm>
                {
                  <div className="dashboard-layout-preview">
                    <ServiceContext.Provider value={fakeServices}>
                      <ChartContext.Provider value={fakeChartContext}>
                        <Grid
                          id={'dashboard-layout-preview-grid'}
                          hasGutter
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {selectedTemplate.cards
                            .filter((cfg) => hasConfigByName(cfg.name))
                            .map((cfg, idx) => (
                              <FeatureFlag level={getConfigByName(cfg.name).featureLevel} key={`${idx}-wrapper`}>
                                <GridItem span={cfg.span} key={idx} order={{ default: idx.toString() }}>
                                  {/* TODO: remove this once we have a preview for JFRMetricsChartCard */}
                                  {cfg.name === JFRMetricsChartCardDescriptor.component.name ? (
                                    <Card isFullHeight isCompact>
                                      Empty preview
                                    </Card>
                                  ) : (
                                    React.createElement(getConfigByName(cfg.name).component, {
                                      span: cfg.span,
                                      ...cfg.props,
                                      dashboardId: idx,
                                      actions: [],
                                    })
                                  )}
                                </GridItem>
                              </FeatureFlag>
                            ))}
                        </Grid>
                      </ChartContext.Provider>
                    </ServiceContext.Provider>
                  </div>
                }
              </DescriptionListGroup>
            </DescriptionList>
          ) : (
            <>No template selected</>
          )}
          <DrawerActions>
            <DrawerCloseButton onClick={onDrawerCloseClick} />
          </DrawerActions>
        </DrawerHead>
      </DrawerPanelContent>
    );
  }, [onDrawerCloseClick, selectedTemplate]);

  const sortedFilteredTemplateLayoutGroup = React.useCallback(
    (title: LayoutTemplateFilter, templates: LayoutTemplate[]) => {
      const sortedSearchFilteredTemplates = searchFilteredTemplates([...templates]).sort((a, b) => {
        switch (selectedSort) {
          case 'Name':
            if (sortDirection === 'asc') {
              return a.name.localeCompare(b.name);
            }
            return b.name.localeCompare(a.name);
          // TODO: uncomment version after more versions are added
          // case 'Version':
          //   if (sortDirection === 'asc') {
          //     return a.version.localeCompare(b.version);
          //   }
          //   return b.version.localeCompare(a.version);
          case 'Card Count':
            if (sortDirection === 'asc') {
              return a.cards.length - b.cards.length;
            }
            return b.cards.length - a.cards.length;
          default:
            return 0;
        }
      });

      return sortedSearchFilteredTemplates.length !== 0 &&
        (selectedFilters.includes(title) || selectedFilters.length === 0) ? (
        <>
          <StackItem>
            <LayoutTemplateGroup
              title={title}
              templates={searchFilteredTemplates(sortedSearchFilteredTemplates)}
              onTemplateSelect={onInnerTemplateSelect}
              onTemplateDelete={onInnerTemplateDelete}
            />
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
        </>
      ) : (
        <></>
      );
    },
    [
      searchFilteredTemplates,
      selectedFilters,
      selectedSort,
      sortDirection,
      onInnerTemplateSelect,
      onInnerTemplateDelete,
    ]
  );

  const RecentTemplates = React.useMemo(() => {
    return recentTemplateRecords
      .map((r) => {
        const template = recordToLayoutTemplate(r, allTemplates);
        if (template) {
          return template;
        } else {
          console.error(`Could not find template for record ${r.name} with vendor ${r.vendor}`);
          return undefined;
        }
      })
      .filter((t) => t !== undefined) as LayoutTemplate[];
  }, [recentTemplateRecords, allTemplates]);

  return (
    <Drawer isExpanded={isDrawerExpanded} isInline>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>
          <OuterScrollContainer>
            <InnerScrollContainer>
              <Toolbar isSticky clearAllFilters={onClearAllFilters}>
                <ToolbarContent>
                  <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint={'md'}>
                    <ToolbarGroup variant="filter-group">
                      <ToolbarItem variant="search-filter">
                        <SearchAutocomplete values={allTemplates.map((t) => t.name)} onChange={onSearchChange} />
                      </ToolbarItem>
                      <ToolbarFilter chips={selectedFilters} deleteChip={onDeleteChip} categoryName="Category">
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
                  <ToolbarGroup variant="icon-button-group">
                    <ToolbarItem>
                      <Button
                        variant="control"
                        aria-label="Sort"
                        onClick={onSortDirectionChange}
                        isAriaDisabled={!selectedSort}
                      >
                        {sortArrowIcon}
                      </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                      <Select
                        menuAppendTo={portalRoot}
                        toggleIcon={<GlobeIcon />}
                        variant={SelectVariant.single}
                        aria-label="Select sorting category"
                        onToggle={onSortSelectToggle}
                        onSelect={onSortSelect}
                        selections={selectedSort}
                        isOpen={isSortSelectOpen}
                        placeholderText="Sort"
                      >
                        <TemplateSortSelectOption sort={'Name'} />
                        <TemplateSortSelectOption sort={'Card Count'} />
                        {/* <TemplateSortSelectOption sort={'Version'} /> */}
                      </Select>
                    </ToolbarItem>
                  </ToolbarGroup>
                  <ToolbarGroup>
                    <ToolbarItem>{uploadButton}</ToolbarItem>
                  </ToolbarGroup>
                </ToolbarContent>
              </Toolbar>
              <Stack>
                {allSearchableTemplateNames.length !== 0 ? (
                  <>
                    {sortedFilteredTemplateLayoutGroup('Suggested', [BlankLayout, ...RecentTemplates])}
                    {sortedFilteredTemplateLayoutGroup('Cryostat', CryostatLayoutTemplates)}
                    {sortedFilteredTemplateLayoutGroup('User-submitted', userSubmittedTemplates)}
                  </>
                ) : (
                  <StackItem>
                    <EmptyState>
                      <EmptyStateIcon icon={PficonTemplateIcon} />
                      <Title size="lg" headingLevel="h4">
                        No templates found
                      </Title>
                      <EmptyStateBody>Upload your own templates!</EmptyStateBody>
                    </EmptyState>
                  </StackItem>
                )}
              </Stack>
            </InnerScrollContainer>
          </OuterScrollContainer>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
