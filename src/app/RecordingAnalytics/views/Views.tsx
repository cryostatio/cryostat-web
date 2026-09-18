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

import { AnalysisResult } from '@app/RecordingAnalytics/AnalysisResult';
import { ThemeSetting } from '@app/Settings/types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { CodeEditorControl } from '@patternfly/react-code-editor';
import {
  Divider,
  FormGroup,
  MenuContainer,
  MenuToggle,
  MenuToggleElement,
  NumberInput,
  Panel,
  PanelMain,
  PanelMainBody,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Switch,
  TreeView,
  TreeViewDataItem,
} from '@patternfly/react-core';
import { PlayIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { concatMap } from 'rxjs';

export interface ViewList {
  vm: string[];
  env: string[];
  app: string[];
}

export interface ViewsProps {
  jvmId: string;
  filename: string;
}

export const Views: React.FC<ViewsProps> = ({ jvmId, filename }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [theme] = useTheme();

  const [viewList, setViewList] = React.useState<ViewList | null>(null);
  const [selectedView, setSelectedView] = React.useState('recording');
  const [isViewSelectOpen, setIsViewSelectOpen] = React.useState(false);
  const [viewFilter, setViewFilter] = React.useState('');
  const [width, setWidth] = React.useState(120);
  const [verbose, setVerbose] = React.useState(false);
  const [truncate, setTruncate] = React.useState('');
  const [isTruncateOpen, setIsTruncateOpen] = React.useState(false);
  const [cellHeight, setCellHeight] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState('');

  const viewToggleRef = React.useRef<HTMLButtonElement>(null);
  const viewMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!jvmId || !filename) {
      setResult('');
      setViewList(null);
      setSelectedView('recording');
      return;
    }
    addSubscription(
      context.api
        .doGet<ViewList>(`targets/${jvmId}/recordings/${filename}/views`, 'beta')
        .subscribe((v) => setViewList(v)),
    );
  }, [jvmId, filename, setResult, setViewList, setSelectedView, addSubscription, context.api]);

  const handleExecute = React.useCallback(() => {
    if (!jvmId || !filename || !selectedView) {
      return;
    }
    setLoading(true);
    setResult('');
    const params = new URLSearchParams({ view: selectedView, width: String(width), verbose: String(verbose) });
    if (truncate) {
      params.set('truncate', truncate);
    }
    const parsedCellHeight = parseInt(cellHeight, 10);
    if (cellHeight !== '' && parsedCellHeight > 0) {
      params.set('cellHeight', String(parsedCellHeight));
    }
    addSubscription(
      context.api
        .sendRequest('beta', `targets/${jvmId}/recordings/${filename}/view`, { method: 'GET' }, params)
        .pipe(concatMap((r) => r.text()))
        .subscribe({
          next: (v) => {
            setResult(v);
            setLoading(false);
          },
          error: (e: Error) => {
            setResult(`${e.name}: ${e.message}`);
            setLoading(false);
          },
        }),
    );
  }, [addSubscription, context.api, jvmId, filename, selectedView, width, verbose, truncate, cellHeight]);

  const filterRegex = React.useMemo(
    () => (viewFilter ? new RegExp(_.escapeRegExp(viewFilter), 'i') : null),
    [viewFilter],
  );

  const treeData = React.useMemo<TreeViewDataItem[]>(() => {
    if (!viewList) return [];

    const makeLeaves = (names: string[]): TreeViewDataItem[] => {
      const leaves = filterRegex ? names.filter((n) => filterRegex.test(n)) : names;
      return leaves.map((n) => ({ name: n, id: n }));
    };

    return [
      { name: 'JVM', id: 'group-vm', children: makeLeaves(viewList.vm) },
      { name: 'Environment', id: 'group-env', children: makeLeaves(viewList.env) },
      { name: 'Application', id: 'group-app', children: makeLeaves(viewList.app) },
    ];
  }, [viewList, filterRegex]);

  const activeTreeItem = React.useMemo<TreeViewDataItem[]>(
    () => (selectedView ? [{ name: selectedView, id: selectedView }] : []),
    [selectedView],
  );

  const handleViewSelect = React.useCallback((_: React.MouseEvent, item: TreeViewDataItem) => {
    if (!item.children) {
      setSelectedView(item.id as string);
      setIsViewSelectOpen(false);
      setViewFilter('');
    }
  }, []);

  const viewMenu = React.useMemo(
    () => (
      <Panel ref={viewMenuRef} variant="raised" style={{ width: '260px', maxHeight: '40vh', overflowY: 'auto' }}>
        <PanelMain>
          {viewList ? (
            <>
              <PanelMainBody style={{ paddingBottom: 0 }}>
                <SearchInput
                  placeholder={t('RecordingAnalytics.Views.FILTER_VIEWS_PLACEHOLDER')}
                  value={viewFilter}
                  onChange={(_, val) => setViewFilter(val)}
                  onClear={() => setViewFilter('')}
                  aria-label={t('RecordingAnalytics.Views.ARIA_LABELS.FILTER_VIEWS')}
                />
              </PanelMainBody>
              <Divider />
              <PanelMainBody style={{ padding: 0 }}>
                <TreeView
                  data={treeData}
                  activeItems={activeTreeItem}
                  onSelect={handleViewSelect}
                  defaultAllExpanded
                  allExpanded={viewFilter.length > 0 || undefined}
                  aria-label={t('RecordingAnalytics.Views.ARIA_LABELS.VIEW_SELECTOR')}
                />
              </PanelMainBody>
            </>
          ) : (
            <PanelMainBody>{t('RecordingAnalytics.Views.SELECT_RECORDING_FIRST')}</PanelMainBody>
          )}
        </PanelMain>
      </Panel>
    ),
    [t, viewMenuRef, viewList, viewFilter, treeData, activeTreeItem, handleViewSelect],
  );

  const viewToggle = React.useMemo(
    () => (
      <MenuToggle
        ref={viewToggleRef}
        onClick={() => setIsViewSelectOpen((o) => !o)}
        isExpanded={isViewSelectOpen}
        isDisabled={!viewList}
        aria-label={t('RecordingAnalytics.Views.ARIA_LABELS.SELECT_VIEW')}
      >
        {selectedView || t('RecordingAnalytics.Views.SELECT_VIEW')}
      </MenuToggle>
    ),
    [t, isViewSelectOpen, selectedView, viewList],
  );

  const truncateToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsTruncateOpen((o) => !o)}
        isExpanded={isTruncateOpen}
        aria-label={t('RecordingAnalytics.Views.ARIA_LABELS.SELECT_TRUNCATE')}
      >
        {truncate || t('RecordingAnalytics.Views.VIEW_DEFAULT')}
      </MenuToggle>
    ),
    [t, isTruncateOpen, truncate],
  );

  const executeControl = React.useMemo(
    () => (
      <CodeEditorControl
        icon={<PlayIcon />}
        aria-label={t('RecordingAnalytics.Views.ARIA_LABELS.RENDER_VIEW')}
        tooltipProps={{ content: t('RecordingAnalytics.Views.ARIA_LABELS.RENDER_VIEW') }}
        onClick={handleExecute}
        isLoading={loading}
        isDisabled={!jvmId || !filename || !selectedView || loading}
      />
    ),
    [t, handleExecute, jvmId, filename, selectedView, loading],
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <Split hasGutter>
          <SplitItem>
            <FormGroup label={t('RecordingAnalytics.Views.FORM_LABELS.VIEW')} fieldId="views-view-select">
              <MenuContainer
                isOpen={isViewSelectOpen}
                onOpenChange={(open) => {
                  setIsViewSelectOpen(open);
                  if (!open) setViewFilter('');
                }}
                onOpenChangeKeys={['Escape']}
                menu={viewMenu}
                menuRef={viewMenuRef}
                toggle={viewToggle}
                toggleRef={viewToggleRef}
              />
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label={t('RecordingAnalytics.Views.FORM_LABELS.WIDTH')} fieldId="views-width-input">
              <NumberInput
                id="views-width-input"
                value={width}
                min={1}
                onMinus={() => setWidth((w) => Math.max(1, w - 1))}
                onPlus={() => setWidth((w) => w + 1)}
                onChange={(e) => {
                  const v = parseInt((e.target as HTMLInputElement).value, 10);
                  if (!isNaN(v) && v > 0) setWidth(v);
                }}
              />
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label={t('RecordingAnalytics.Views.FORM_LABELS.VERBOSE')} fieldId="views-verbose-switch">
              <Switch
                id="views-verbose-switch"
                aria-label={t('RecordingAnalytics.Views.ARIA_LABELS.VERBOSE')}
                isChecked={verbose}
                onChange={(_e, checked) => setVerbose(checked)}
              />
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label={t('RecordingAnalytics.Views.FORM_LABELS.TRUNCATE')} fieldId="views-truncate-select">
              <Select
                id="views-truncate-select"
                toggle={truncateToggle}
                isOpen={isTruncateOpen}
                onSelect={(_, val) => {
                  setTruncate(val as string);
                  setIsTruncateOpen(false);
                }}
                onOpenChange={setIsTruncateOpen}
                onOpenChangeKeys={['Escape']}
                selected={truncate}
              >
                <SelectList>
                  <SelectOption value="">{t('RecordingAnalytics.Views.VIEW_DEFAULT')}</SelectOption>
                  <SelectOption value="beginning">{t('RecordingAnalytics.Views.TRUNCATE.BEGINNING')}</SelectOption>
                  <SelectOption value="end">{t('RecordingAnalytics.Views.TRUNCATE.END')}</SelectOption>
                </SelectList>
              </Select>
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label={t('RecordingAnalytics.Views.FORM_LABELS.CELL_HEIGHT')} fieldId="views-cellheight-input">
              <NumberInput
                id="views-cellheight-input"
                value={cellHeight === '' ? '' : parseInt(cellHeight, 10)}
                min={1}
                onMinus={() =>
                  setCellHeight((h) => {
                    const n = parseInt(h, 10);
                    return isNaN(n) || n <= 1 ? '' : String(n - 1);
                  })
                }
                onPlus={() =>
                  setCellHeight((h) => {
                    const n = parseInt(h, 10);
                    return isNaN(n) ? '1' : String(n + 1);
                  })
                }
                onChange={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  if (raw === '') {
                    setCellHeight('');
                  } else {
                    const v = parseInt(raw, 10);
                    if (!isNaN(v) && v > 0) setCellHeight(String(v));
                  }
                }}
              />
            </FormGroup>
          </SplitItem>
        </Split>
      </StackItem>
      <StackItem>
        <AnalysisResult
          isDarkTheme={theme === ThemeSetting.DARK}
          height="sizeToFit"
          code={result}
          customControls={[executeControl]}
        />
      </StackItem>
    </Stack>
  );
};

export default Views;
