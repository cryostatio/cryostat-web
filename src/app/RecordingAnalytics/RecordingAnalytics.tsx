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

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ThemeSetting } from '@app/Settings/types';
import { RecordingDirectory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CodeBlock,
  CodeBlockCode,
  DropdownItem,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SimpleDropdown } from '@patternfly/react-templates';
import * as React from 'react';
import { concatMap, map } from 'rxjs';

export const RecordingAnalytics: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [jvmId, setJvmId] = React.useState('');
  const [jvmIds, setJvmIds] = React.useState([] as string[]);
  const [filename, setFilename] = React.useState('');
  const [filenames, setFilenames] = React.useState([] as string[]);

  const [theme] = useTheme();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState('');

  React.useEffect(() => {
    addSubscription(
      context.api
        .doGet<RecordingDirectory[]>('fs/recordings', 'beta')
        .pipe(map((v) => v.map((e) => e.jvmId)))
        .subscribe((v) => setJvmIds(v)),
    );
  }, [addSubscription, context, context.api, setJvmIds]);

  React.useEffect(() => {
    // FIME the other GET /api/beta/fs/recordings call already returns this information, we don't need to query for it separately
    addSubscription(
      context.api
        .doGet<RecordingDirectory[]>(`fs/recordings/${jvmId}`, 'beta')
        .pipe(
          map((v) => v[0]),
          map((v) => v.recordings),
          map((v) => v.map((e) => e.name)),
        )
        .subscribe((v) => setFilenames(v)),
    );
  }, [addSubscription, context, context.api, jvmId, setFilenames]);

  const jvmIdItems = React.useMemo(() => {
    return jvmIds
      .map((id) => ({
        value: id,
        onClick: () => setJvmId(id),
        content: <DropdownItem>{id}</DropdownItem>,
      }))
      .concat([
        {
          value: 'No Selection',
          onClick: () => setJvmId(''),
          content: <DropdownItem>No Selection</DropdownItem>,
        },
      ]);
  }, [jvmIds, setJvmId]);

  const filenameItems = React.useMemo(() => {
    return filenames
      .map((f) => ({
        value: f,
        onClick: () => setFilename(f),
        content: <DropdownItem>{f}</DropdownItem>,
      }))
      .concat([
        {
          value: 'No Selection',
          onClick: () => setFilename(''),
          content: <DropdownItem>No Selection</DropdownItem>,
        },
      ]);
  }, [filenames, setFilename]);

  const onEditorDidMount = React.useCallback((editor, monaco) => {
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0].updateOptions({ tabSize: 4 });
  }, []);

  const handleExecute = React.useCallback(() => {
    if (!jvmId || !filename || !query) {
      return;
    }
    setLoading(true);
    setResult('');
    const body = new window.FormData();
    body.append('query', query.trim());
    addSubscription(
      context.api
        .sendRequest('beta', `recording_analytics/${jvmId}/${filename}`, {
          method: 'POST',
          body,
        })
        .pipe(concatMap((r) => r.json()))
        .subscribe({
          next: (v) => {
            setResult(JSON.stringify(v, null, 2));
            setLoading(false);
          },
          error: (e: Error) => {
            setResult(`${e.name}: ${e.message}`);
            setLoading(false);
          },
        }),
    );
  }, [addSubscription, context, setLoading, setResult, jvmId, filename, query]);

  return (
    <BreadcrumbPage pageTitle="Analytics">
      <Card isCompact>
        <CardHeader>
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup>
                <ToolbarItem>
                  <SimpleDropdown toggleContent="JVM ID" initialItems={jvmIdItems} />
                </ToolbarItem>
                <ToolbarItem>
                  <SimpleDropdown toggleContent="Filename" isDisabled={!jvmId} initialItems={filenameItems} />
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>
        </CardHeader>
        <CardBody>
          <Stack hasGutter>
            <StackItem>
              <CodeEditor
                isDarkTheme={theme === ThemeSetting.DARK}
                onChange={setQuery}
                onEditorDidMount={onEditorDidMount}
                height="120px"
                language={Language.sql}
                isLineNumbersVisible
                isLanguageLabelVisible
              />
            </StackItem>
            <StackItem>
              <Button onClick={handleExecute} isDisabled={!jvmId || !filename || !query || loading}>
                Execute
              </Button>
            </StackItem>
            <StackItem>
              <CodeBlock>
                <CodeBlockCode>{result}</CodeBlockCode>
              </CodeBlock>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default RecordingAnalytics;
