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
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { RootState, dashboardConfigDeleteTemplateIntent } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { fakeChartContext, fakeServices } from '@app/utils/fakeData';
import { useFeatureLevel } from '@app/utils/hooks/useFeatureLevel';
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
  List,
  ListItem,
  ListVariant,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  EmptyStateHeader,
  SelectList,
  Select,
  SelectOption,
  Badge,
  MenuToggle,
  MenuToggleElement,
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
import { InnerScrollContainer } from '@patternfly/react-table';
import { TFunction } from 'i18next';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { ChartContext } from './Charts/context';
import { CryostatLayoutTemplates, BlankLayout } from './cryostat-dashboard-templates';
import { LayoutTemplateGroup, smallestFeatureLevel } from './LayoutTemplateGroup';
import { SearchAutocomplete } from './SearchAutocomplete';
import { LayoutTemplate, LayoutTemplateFilter, LayoutTemplateRecord, SelectedLayoutTemplate } from './types';
import {
  getCardDescriptorByName,
  hasCardDescriptorByName,
  LayoutTemplateContext,
  recordToLayoutTemplate,
} from './utils';

export enum LayoutTemplateSort {
  NAME = 'Name',
  CARD_COUNT = 'Card count',
  // TODO: add 'Version' after more version are released
}

export const getSortToggleDisplay = (sort: LayoutTemplateSort, t: TFunction): string => {
  switch (sort) {
    case LayoutTemplateSort.NAME:
      return t('LayoutTemplatePicker.SORT_BY.NAME');
    case LayoutTemplateSort.CARD_COUNT:
      return t('LayoutTemplatePicker.SORT_BY.CARD_COUNT');
    default:
      return `${sort}`;
  }
};

const CARD_PREVIEW_LIMIT = 16;

export interface LayoutTemplatePickerProps {
  onTemplateSelect: (selectedTemplate: SelectedLayoutTemplate) => void;
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({ onTemplateSelect }) => {
  const { selectedTemplate, setSelectedTemplate, setIsUploadModalOpen } = React.useContext(LayoutTemplateContext);
  const serviceContext = React.useContext(ServiceContext);
  const dispatch = useDispatch();
  const activeLevel = useFeatureLevel();

  const [searchFilter, setSearchFilter] = React.useState('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [selectedFilters, setSelectedFilters] = React.useState<LayoutTemplateFilter[]>([]);

  const [isSortSelectOpen, setIsSortSelectOpen] = React.useState(false);
  const [selectedSort, setSelectedSort] = React.useState<LayoutTemplateSort>(LayoutTemplateSort.NAME);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const [isDeleteWarningModalOpen, setIsDeleteWarningModalOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<string>('');

  const { t } = useTranslation();
  const recentTemplateRecords: LayoutTemplateRecord[] = useSelector(
    (state: RootState) => state.dashboardConfigs.templateHistory,
  );
  const userSubmittedTemplates: LayoutTemplate[] = useSelector(
    (state: RootState) => state.dashboardConfigs.customTemplates,
  );

  const searchFilteredTemplates = React.useCallback(
    (templates: LayoutTemplate[]): LayoutTemplate[] => {
      if (!searchFilter) {
        return templates;
      }
      const reg = new RegExp(_.escapeRegExp(searchFilter), 'i');
      return templates.filter((t) => reg.test(t.name));
    },
    [searchFilter],
  );

  const allTemplates: LayoutTemplate[] = React.useMemo(() => {
    return [BlankLayout, ...CryostatLayoutTemplates, ...userSubmittedTemplates];
  }, [userSubmittedTemplates]);

  const allSearchableTemplateNames: string[] = React.useMemo(() => {
    return Array.from(new Set(searchFilteredTemplates(allTemplates).map((t) => t.name)));
  }, [searchFilteredTemplates, allTemplates]);

  const onInnerTemplateSelect = React.useCallback(
    (template: SelectedLayoutTemplate) => {
      onTemplateSelect(template);
      setSelectedTemplate(template);
      setIsDrawerExpanded(true);
    },
    [onTemplateSelect, setSelectedTemplate, setIsDrawerExpanded],
  );

  const handleTemplateDelete = React.useCallback(
    (name) => {
      dispatch(dashboardConfigDeleteTemplateIntent(name));
      setSelectedTemplate((prev) => {
        if (prev?.template.name === name) {
          return undefined;
        }
        return prev;
      });
    },
    [dispatch, setSelectedTemplate],
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
    [serviceContext.settings, setIsDeleteWarningModalOpen, setToDelete, handleTemplateDelete],
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
        data-quickstart-id="dashboard-upload-btn"
      >
        <UploadIcon />
      </Button>
    ),
    [t, handleUploadButton],
  );

  const onSearchChange = React.useCallback(
    (value: string) => {
      setSearchFilter(value);
    },
    [setSearchFilter],
  );

  const onDeleteChip = React.useCallback(
    (_category: string, chip: string) => {
      setSelectedFilters((prev) => prev.filter((item) => item !== chip));
    },
    [setSelectedFilters],
  );

  const onFilterSelect = React.useCallback(
    (_ev: React.MouseEvent<Element, MouseEvent>, selected: LayoutTemplateFilter) => {
      setSelectedFilters((prev) => {
        if (prev.includes(selected)) {
          return prev.filter((item) => item !== selected);
        }
        return [...prev, selected];
      });
    },
    [setSelectedFilters],
  );

  const onFilterSelectToggle = React.useCallback(() => {
    setIsFilterSelectOpen((isExpanded) => !isExpanded);
  }, [setIsFilterSelectOpen]);

  const onClearAllFilters = React.useCallback(() => {
    setSelectedFilters([]);
  }, [setSelectedFilters]);

  const onSortSelectToggle = React.useCallback(() => {
    setIsSortSelectOpen((isExpanded) => !isExpanded);
  }, [setIsSortSelectOpen]);

  const onSortSelect = React.useCallback(
    (_ev: React.MouseEvent<Element, MouseEvent>, selected: LayoutTemplateSort) => {
      setSelectedSort(selected);
      setIsSortSelectOpen(false);
    },
    [setSelectedSort, setIsSortSelectOpen],
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
    const template = selectedTemplate?.template;
    const numCards = template?.cards.length ?? 0;
    return (
      <DrawerPanelContent isResizable defaultSize="50%" className={'layout-template-picker-drawer__panel'}>
        <DrawerHead>
          <DrawerActions>
            <DrawerCloseButton onClick={onDrawerCloseClick} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody style={{ marginTop: '-3.5em' }}>
          {template ? (
            <DescriptionList isFillColumns>
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>{template.name}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>{template.description}</DescriptionListDescription>
              </DescriptionListGroup>
              {template.vendor && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Vendor</DescriptionListTerm>
                  <DescriptionListDescription>{template.vendor}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {template?.version && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Version</DescriptionListTerm>
                  <DescriptionListDescription>{template.version}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>Preview ({numCards} Cards)</DescriptionListTerm>
                {
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
                        {numCards === 0 ? (
                          <EmptyState>
                            <EmptyStateBody>Empty preview</EmptyStateBody>
                          </EmptyState>
                        ) : (
                          <>
                            {template.cards
                              .slice(0, CARD_PREVIEW_LIMIT)
                              .filter((cfg) => hasCardDescriptorByName(cfg.name))
                              .map((cfg, idx) => (
                                <GridItem
                                  span={
                                    numCards === 1 ||
                                    cfg.name === 'AutomatedAnalysisCard' ||
                                    cfg.name === 'JvmDetailsCard'
                                      ? 12
                                      : 6
                                  }
                                  key={idx}
                                  order={{ default: idx.toString() }}
                                >
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
                                    <div className="preview-card">
                                      {React.createElement(getCardDescriptorByName(cfg.name).component, {
                                        span: cfg.span,
                                        ...cfg.props,
                                        dashboardId: idx,
                                        actions: [],
                                        isDraggable: false,
                                        isResizable: false,
                                        isFullHeight: false,
                                      })}
                                    </div>
                                  )}
                                </GridItem>
                              ))}
                            {numCards > CARD_PREVIEW_LIMIT && (
                              <GridItem
                                span={12}
                                key={CARD_PREVIEW_LIMIT}
                                order={{ default: CARD_PREVIEW_LIMIT.toString() }}
                              >
                                <Card isFullHeight isCompact>
                                  <CardHeader>
                                    <Title headingLevel={'h4'}>Remaining cards ({numCards - CARD_PREVIEW_LIMIT})</Title>
                                  </CardHeader>
                                  <CardBody>
                                    <List variant={ListVariant.inline} isPlain>
                                      {template.cards
                                        .slice(CARD_PREVIEW_LIMIT)
                                        .filter((cfg) => hasCardDescriptorByName(cfg.name))
                                        .map((cfg, idx) => {
                                          return (
                                            <ListItem key={idx} icon={getCardDescriptorByName(cfg.name).icon}>
                                              {cfg.props['chartKind'] || t(getCardDescriptorByName(cfg.name).title)}
                                            </ListItem>
                                          );
                                        })}
                                    </List>
                                  </CardBody>
                                </Card>
                              </GridItem>
                            )}
                          </>
                        )}
                      </Grid>
                    </ChartContext.Provider>
                  </ServiceContext.Provider>
                }
              </DescriptionListGroup>
            </DescriptionList>
          ) : (
            <Bullseye>
              <EmptyState variant={EmptyStateVariant.full}>
                <EmptyStateHeader
                  titleText="No template selected"
                  icon={<EmptyStateIcon icon={InfoCircleIcon} />}
                  headingLevel="h5"
                />
              </EmptyState>
            </Bullseye>
          )}
        </DrawerPanelBody>
      </DrawerPanelContent>
    );
  }, [t, onDrawerCloseClick, selectedTemplate]);

  const sortedFilteredFeatureLeveledTemplateLayoutGroup = React.useCallback(
    (title: LayoutTemplateFilter, templates: LayoutTemplate[], divider: boolean = true) => {
      const featuredLevelledTemplates = templates.filter((t) => smallestFeatureLevel(t.cards) >= activeLevel);
      const sortedSearchFilteredTemplates = searchFilteredTemplates(featuredLevelledTemplates).sort((a, b) => {
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
          case 'Card count':
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
          {divider && (
            <StackItem>
              <Divider />
            </StackItem>
          )}
        </>
      ) : null;
    },
    [
      activeLevel,
      searchFilteredTemplates,
      selectedFilters,
      selectedSort,
      sortDirection,
      onInnerTemplateSelect,
      onInnerTemplateDelete,
    ],
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
          <Toolbar isSticky clearAllFilters={onClearAllFilters}>
            <ToolbarContent>
              <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint={'md'}>
                <ToolbarGroup variant="filter-group">
                  <ToolbarItem variant="search-filter">
                    <SearchAutocomplete
                      values={allTemplates.map((t) => t.name)}
                      onChange={onSearchChange}
                      placeholder={t('LayoutTemplatePicker.SEARCH_PLACEHOLDER')}
                    />
                  </ToolbarItem>
                  <ToolbarFilter chips={selectedFilters} deleteChip={onDeleteChip} categoryName="Category">
                    <Select
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={onFilterSelectToggle}
                          isExpanded={isFilterSelectOpen}
                          badge={selectedFilters.length ? <Badge isRead>{selectedFilters.length}</Badge> : null}
                        >
                          Template Type
                        </MenuToggle>
                      )}
                      aria-label="Select template category"
                      onSelect={onFilterSelect}
                      selected={selectedFilters}
                      isOpen={isFilterSelectOpen}
                      onOpenChangeKeys={['Escape']}
                      onOpenChange={setIsFilterSelectOpen}
                    >
                      <SelectList>
                        <SelectOption
                          key="suggested"
                          value={'Suggested'}
                          hasCheckbox
                          isSelected={selectedFilters.includes('Suggested')}
                        >
                          {t('SUGGESTED', { ns: 'common' })}
                        </SelectOption>
                        <SelectOption
                          key="cryostat"
                          value="Cryostat"
                          hasCheckbox
                          isSelected={selectedFilters.includes('Cryostat')}
                        >
                          Cryostat
                        </SelectOption>
                        <SelectOption
                          key="user-submitted"
                          value={'User-submitted'}
                          hasCheckbox
                          isSelected={selectedFilters.includes('User-submitted')}
                        >
                          {t('USER_SUBMITTED', { ns: 'common' })}
                        </SelectOption>
                      </SelectList>
                    </Select>
                  </ToolbarFilter>
                </ToolbarGroup>
              </ToolbarToggleGroup>
              <ToolbarItem variant="separator" />
              <ToolbarGroup>
                <ToolbarItem>
                  <Select
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle ref={toggleRef} onClick={onSortSelectToggle} isExpanded={isSortSelectOpen}>
                        {getSortToggleDisplay(selectedSort, t)}
                      </MenuToggle>
                    )}
                    aria-label="Select sorting category"
                    onSelect={onSortSelect}
                    selected={selectedSort}
                    isOpen={isSortSelectOpen}
                    onOpenChange={setIsSortSelectOpen}
                    onOpenChangeKeys={['Escape']}
                  >
                    <SelectList>
                      <SelectOption key={LayoutTemplateSort.NAME} value={LayoutTemplateSort.NAME}>
                        {t('NAME', { ns: 'common' })}
                      </SelectOption>
                      <SelectOption key={LayoutTemplateSort.CARD_COUNT} value={LayoutTemplateSort.CARD_COUNT}>
                        {t('LayoutTemplatePicker.CARD_COUNT')}
                      </SelectOption>
                    </SelectList>
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
              <ToolbarItem variant="separator" />
              <ToolbarGroup variant="icon-button-group">
                <ToolbarItem>{uploadButton}</ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>
          <InnerScrollContainer>
            <Stack>
              {allSearchableTemplateNames.length > 0 ? (
                <>
                  {sortedFilteredFeatureLeveledTemplateLayoutGroup('Suggested', [BlankLayout, ...RecentTemplates])}
                  {sortedFilteredFeatureLeveledTemplateLayoutGroup(
                    'Cryostat',
                    CryostatLayoutTemplates,
                    userSubmittedTemplates.length > 0,
                  )}
                  {sortedFilteredFeatureLeveledTemplateLayoutGroup('User-submitted', userSubmittedTemplates, false)}
                </>
              ) : (
                <StackItem>
                  <EmptyState>
                    <EmptyStateHeader
                      titleText="No templates found"
                      icon={<EmptyStateIcon icon={PficonTemplateIcon} />}
                      headingLevel="h4"
                    />
                    <EmptyStateBody>Upload a template and try again.</EmptyStateBody>
                  </EmptyState>
                </StackItem>
              )}
            </Stack>
          </InnerScrollContainer>
        </DrawerContentBody>
      </DrawerContent>
      {deleteWarningModal}
    </Drawer>
  );
};
