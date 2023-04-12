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
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { RootState, dashboardConfigDeleteTemplateIntent } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { fakeChartContext, fakeServices } from '@app/utils/fakeData';
import { portalRoot } from '@app/utils/utils';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  CardHeader,
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
  DrawerPanelBody,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
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
  InfoCircleIcon,
  PficonTemplateIcon,
  SortAmountDownAltIcon,
  SortAmountUpAltIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import { InnerScrollContainer, OuterScrollContainer } from '@patternfly/react-table';
import React from 'react';

import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { ChartContext } from './Charts/ChartContext';
import { CryostatLayoutTemplates, BlankLayout } from './cryostat-dashboard-templates';
import { getConfigByName, hasConfigByName } from './Dashboard';
import { LayoutTemplate, LayoutTemplateContext, LayoutTemplateRecord, recordToLayoutTemplate } from './dashboard-utils';
import { LayoutTemplateGroup } from './LayoutTemplateGroup';
import { SearchAutocomplete } from './SearchAutocomplete';

export type LayoutTemplateFilter = 'Suggested' | 'Cryostat' | 'User-submitted';

export enum LayoutTemplateSort {
  NAME = 'Name',
  CARD_COUNT = 'Card Count',
  // TODO: add 'Version' after more version are released
}

const CARD_PREVIEW_LIMIT = 16;

export interface LayoutTemplatePickerProps {
  onTemplateSelect: (templateName: LayoutTemplate) => void;
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({ onTemplateSelect }) => {
  const { selectedTemplate, setSelectedTemplate, setIsUploadModalOpen } = React.useContext(LayoutTemplateContext);
  const serviceContext = React.useContext(ServiceContext);
  const dispatch = useDispatch();

  const [searchFilter, setSearchFilter] = React.useState('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [selectedFilters, setSelectedFilters] = React.useState<LayoutTemplateFilter[]>([]);

  const [isSortSelectOpen, setIsSortSelectOpen] = React.useState(false);
  const [selectedSort, setSelectedSort] = React.useState<LayoutTemplateSort | undefined>(undefined);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const [isDeleteWarningModalOpen, setIsDeleteWarningModalOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<string>('');

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

  // array order is needed for template selection to fallback, if current is deleted
  const allTemplates: LayoutTemplate[] = React.useMemo(() => {
    return [BlankLayout, ...CryostatLayoutTemplates, ...userSubmittedTemplates];
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

  const handleTemplateDelete = React.useCallback(
    (name) => {
      dispatch(dashboardConfigDeleteTemplateIntent(name));
      setSelectedTemplate((prev) => {
        if (prev?.name === name) {
          return undefined;
        }
        return prev;
      });
    },
    [dispatch, setSelectedTemplate]
  );

  const onInnerTemplateDelete = React.useCallback(
    (templateName: string) => {
      if (serviceContext.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteLayoutTemplate)) {
        setIsDeleteWarningModalOpen(true);
        setToDelete(templateName);
      } else {
        handleTemplateDelete(templateName);
      }
    },
    [serviceContext.settings, setIsDeleteWarningModalOpen, setToDelete, handleTemplateDelete]
  );

  const handleDeleteWarningModalClose = React.useCallback(() => {
    setIsDeleteWarningModalOpen(false);
    setToDelete('');
  }, [setIsDeleteWarningModalOpen, setToDelete]);

  const deleteWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteLayoutTemplate}
        visible={isDeleteWarningModalOpen}
        onClose={handleDeleteWarningModalClose}
        onAccept={() => handleTemplateDelete(toDelete)}
      />
    );
  }, [isDeleteWarningModalOpen, toDelete, handleDeleteWarningModalClose, handleTemplateDelete]);

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
      const selected = selection.valueOf() as LayoutTemplateSort;
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
    return sortDirection === 'asc' ? <SortAmountDownAltIcon /> : <SortAmountUpAltIcon />;
  }, [selectedSort, sortDirection]);

  const onSortDirectionChange = React.useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, [setSortDirection]);

  const onDrawerCloseClick = React.useCallback(() => {
    setIsDrawerExpanded(false);
  }, [setIsDrawerExpanded]);

  const panelContent = React.useMemo(() => {
    return (
      <DrawerPanelContent isResizable defaultSize="37%">
        <DrawerHead>
          <DrawerActions>
            <DrawerCloseButton onClick={onDrawerCloseClick} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody style={{ marginTop: '-3.5em' }}>
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
                <DescriptionListTerm>Preview</DescriptionListTerm>
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
                            .slice(0, CARD_PREVIEW_LIMIT)
                            .filter((cfg) => hasConfigByName(cfg.name))
                            .map((cfg, idx) => (
                              <GridItem span={cfg.span} key={idx} order={{ default: idx.toString() }}>
                                {/* TODO: remove this once we have a preview for JFRMetricsChartCard */}
                                {cfg.name === 'JFRMetricsChartCard' ? (
                                  <Card isFullHeight isCompact>
                                    <CardHeader>
                                      <Title headingLevel={'h4'}>{cfg.props['chartKind']}</Title>
                                    </CardHeader>
                                    <CardBody>
                                      <Bullseye>
                                        <EmptyState>
                                          <EmptyStateBody>Empty preview</EmptyStateBody>
                                        </EmptyState>
                                      </Bullseye>
                                    </CardBody>
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
                            ))}
                        </Grid>
                      </ChartContext.Provider>
                    </ServiceContext.Provider>
                  </div>
                }
              </DescriptionListGroup>
            </DescriptionList>
          ) : (
            <Bullseye>
              <EmptyState variant={EmptyStateVariant.full}>
                <EmptyStateIcon icon={InfoCircleIcon} />
                <Title headingLevel="h5" size="lg">
                  No template selected
                </Title>
              </EmptyState>
            </Bullseye>
          )}
        </DrawerPanelBody>
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
              templates={sortedSearchFilteredTemplates}
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

  React.useLayoutEffect(() => {
    if (selectedTemplate) {
      document
        .querySelector('.layout-template-picker .catalog-tile-pf.featured')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedTemplate]);

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
                          <SelectOption key="suggested" value={t('SUGGESTED', { ns: 'common' })} />
                          <SelectOption key="cryostat" value="Cryostat" />
                          <SelectOption key="user-submitted" value={t('USER_SUBMITTED', { ns: 'common' })} />
                        </Select>
                      </ToolbarFilter>
                    </ToolbarGroup>
                  </ToolbarToggleGroup>
                  <ToolbarGroup variant="icon-button-group">
                    <ToolbarItem>
                      <Select
                        menuAppendTo={portalRoot}
                        aria-label="Select sorting category"
                        onToggle={onSortSelectToggle}
                        onSelect={onSortSelect}
                        selections={selectedSort}
                        isOpen={isSortSelectOpen}
                        placeholderText={t('LayoutTemplatePicker.SORT_BY.PLACEHOLDER') as string}
                      >
                        <SelectOption
                          key={LayoutTemplateSort.NAME}
                          value={
                            {
                              toString: () => `${t('LayoutTemplatePicker.SORT_BY.NAME')}`,
                              valueOf: () => LayoutTemplateSort.NAME,
                            } as SelectOptionObject
                          }
                        />
                        <SelectOption
                          key={LayoutTemplateSort.CARD_COUNT}
                          value={
                            {
                              toString: () => `${t('LayoutTemplatePicker.SORT_BY.CARD_COUNT')}`,
                              valueOf: () => LayoutTemplateSort.CARD_COUNT,
                            } as SelectOptionObject
                          }
                        />
                      </Select>
                    </ToolbarItem>
                    <ToolbarItem>
                      <Button
                        variant="plain"
                        aria-label="Sort"
                        onClick={onSortDirectionChange}
                        isAriaDisabled={!selectedSort}
                      >
                        {sortArrowIcon}
                      </Button>
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
                    {sortedFilteredTemplateLayoutGroup(t('SUGGESTED', { ns: 'common' }), [
                      BlankLayout,
                      ...RecentTemplates,
                    ])}
                    {sortedFilteredTemplateLayoutGroup('Cryostat', CryostatLayoutTemplates)}
                    {sortedFilteredTemplateLayoutGroup(t('USER_SUBMITTED', { ns: 'common' }), userSubmittedTemplates)}
                  </>
                ) : (
                  <StackItem>
                    <EmptyState>
                      <EmptyStateIcon icon={PficonTemplateIcon} />
                      <Title size="lg" headingLevel="h4">
                        No templates found
                      </Title>
                      <EmptyStateBody>Upload a template and try again.</EmptyStateBody>
                    </EmptyState>
                  </StackItem>
                )}
              </Stack>
            </InnerScrollContainer>
          </OuterScrollContainer>
        </DrawerContentBody>
      </DrawerContent>
      {deleteWarningModal}
    </Drawer>
  );
};
