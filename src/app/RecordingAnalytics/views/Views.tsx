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

import { ThemeSetting } from '@app/Settings/types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
import { CodeEditor, CodeEditorControl } from '@patternfly/react-code-editor';
import {
  Divider,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  NumberInput,
  Select,
  SelectGroup,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Switch,
} from '@patternfly/react-core';
import { PlayIcon } from '@patternfly/react-icons';
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
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [theme] = useTheme();

  const [viewList, setViewList] = React.useState<ViewList | null>(null);
  const [selectedView, setSelectedView] = React.useState('recording');
  const [isViewSelectOpen, setIsViewSelectOpen] = React.useState(false);
  const [width, setWidth] = React.useState(120);
  const [verbose, setVerbose] = React.useState(false);
  const [truncate, setTruncate] = React.useState('');
  const [isTruncateOpen, setIsTruncateOpen] = React.useState(false);
  const [cellHeight, setCellHeight] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState('');

  React.useEffect(() => {
    if (!jvmId || !filename) {
      setViewList(null);
      setSelectedView('recording');
      return;
    }
    addSubscription(
      context.api
        .doGet<ViewList>(`targets/${jvmId}/recordings/${filename}/views`, 'beta')
        .subscribe((v) => setViewList(v)),
    );
  }, [jvmId, filename, addSubscription, context.api]);

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

  const viewToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsViewSelectOpen((o) => !o)}
        isExpanded={isViewSelectOpen}
        isDisabled={!viewList}
        aria-label="Select view"
      >
        {selectedView || 'Select view'}
      </MenuToggle>
    ),
    [isViewSelectOpen, selectedView, viewList],
  );

  const truncateToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsTruncateOpen((o) => !o)}
        isExpanded={isTruncateOpen}
        aria-label="Select truncate"
      >
        {truncate || 'View default'}
      </MenuToggle>
    ),
    [isTruncateOpen, truncate],
  );

  const executeControl = React.useMemo(
    () => (
      <CodeEditorControl
        icon={<PlayIcon />}
        aria-label="Render view"
        tooltipProps={{ content: 'Render view' }}
        onClick={handleExecute}
        isLoading={loading}
        isDisabled={!jvmId || !filename || !selectedView || loading}
      />
    ),
    [handleExecute, jvmId, filename, selectedView, loading],
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <Split hasGutter>
          <SplitItem>
            <FormGroup label="View" fieldId="views-view-select">
              <Select
                id="views-view-select"
                toggle={viewToggle}
                isOpen={isViewSelectOpen}
                onSelect={(_, val) => {
                  setSelectedView(val as string);
                  setIsViewSelectOpen(false);
                }}
                onOpenChange={setIsViewSelectOpen}
                onOpenChangeKeys={['Escape']}
                selected={selectedView}
                isScrollable
                maxMenuHeight="40vh"
              >
                <SelectList>
                  {viewList ? (
                    <>
                      <SelectGroup label="JVM">
                        {viewList.vm.map((v) => (
                          <SelectOption key={v} value={v}>
                            {v}
                          </SelectOption>
                        ))}
                      </SelectGroup>
                      <Divider />
                      <SelectGroup label="Environment">
                        {viewList.env.map((v) => (
                          <SelectOption key={v} value={v}>
                            {v}
                          </SelectOption>
                        ))}
                      </SelectGroup>
                      <Divider />
                      <SelectGroup label="Application">
                        {viewList.app.map((v) => (
                          <SelectOption key={v} value={v}>
                            {v}
                          </SelectOption>
                        ))}
                      </SelectGroup>
                    </>
                  ) : (
                    <SelectOption isDisabled>Select a recording first</SelectOption>
                  )}
                </SelectList>
              </Select>
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label="Width" fieldId="views-width-input">
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
            <FormGroup label="Verbose" fieldId="views-verbose-switch">
              <Switch
                id="views-verbose-switch"
                aria-label="Verbose"
                isChecked={verbose}
                onChange={(_e, checked) => setVerbose(checked)}
              />
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label="Truncate" fieldId="views-truncate-select">
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
                  <SelectOption value="">View default</SelectOption>
                  <SelectOption value="beginning">beginning</SelectOption>
                  <SelectOption value="end">end</SelectOption>
                </SelectList>
              </Select>
            </FormGroup>
          </SplitItem>
          <SplitItem>
            <FormGroup label="Cell height" fieldId="views-cellheight-input">
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
        <CodeEditor
          isReadOnly
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
