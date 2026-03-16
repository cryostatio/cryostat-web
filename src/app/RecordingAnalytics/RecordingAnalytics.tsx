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
import { modalPrefillClearIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { RecordingDirectory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
import { loader } from '@monaco-editor/react';
import { CodeEditor, CodeEditorControl, Language } from '@patternfly/react-code-editor';
import {
  Card,
  CardBody,
  CardHeader,
  CodeBlock,
  CodeBlockCode,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlayIcon } from '@patternfly/react-icons';
import { SimpleDropdown, SimpleDropdownItem } from '@patternfly/react-templates';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { concatMap } from 'rxjs';

loader.config({ monaco });

export const RecordingAnalytics: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const modalPrefill = useSelector((state: RootState) => state.modalPrefill);

  const [jvmId, setJvmId] = React.useState('');
  const [recordingDirectories, setRecordingDirectories] = React.useState([] as RecordingDirectory[]);
  const [filename, setFilename] = React.useState('');

  const [theme] = useTheme();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState('');

  React.useEffect(() => {
    addSubscription(
      context.api.doGet<RecordingDirectory[]>('fs/recordings', 'beta').subscribe((v) => {
        setRecordingDirectories(v);
      }),
    );
  }, [addSubscription, context, context.api, setRecordingDirectories]);

  React.useEffect(() => {
    const stateData = location.state as Record<string, unknown> | null;
    const reduxData = modalPrefill.route === location.pathname ? (modalPrefill.data as Record<string, unknown>) : null;

    const prefillJvmId = (stateData?.jvmId || reduxData?.jvmId) as string | undefined;
    const prefillFilename = (stateData?.filename || reduxData?.filename) as string | undefined;

    if (prefillJvmId && recordingDirectories.some((d) => d.jvmId === prefillJvmId)) {
      setJvmId(prefillJvmId);

      if (prefillFilename) {
        const directory = recordingDirectories.find((d) => d.jvmId === prefillJvmId);
        if (directory && directory.recordings.some((r) => r.name === prefillFilename)) {
          setFilename(prefillFilename);
        }
      }

      dispatch(modalPrefillClearIntent());
      if (location.state) {
        navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
      }
    }
  }, [
    recordingDirectories,
    location.state,
    location.pathname,
    location.search,
    location.hash,
    modalPrefill,
    dispatch,
    navigate,
  ]);

  const jvmIds = React.useMemo(() => recordingDirectories.map((e) => e.jvmId), [recordingDirectories]);

  const filenames = React.useMemo(() => {
    const directory = recordingDirectories.find((d) => d.jvmId === jvmId);
    return directory ? directory.recordings.map((r) => r.name) : [];
  }, [recordingDirectories, jvmId]);

  const jvmIdItems = React.useMemo(() => {
    const a: SimpleDropdownItem[] = jvmIds
      .map(
        (id) =>
          ({
            value: id,
            onClick: () => {
              setJvmId(id);
              setFilename('');
            },
            content: id,
          }) as SimpleDropdownItem,
      )
      .concat([
        {
          value: '',
          isDivider: true,
        },
        {
          value: 'Clear Selection',
          onClick: () => {
            setJvmId('');
            setFilename('');
          },
          content: 'Clear Selection',
        },
      ]);
    return a;
  }, [jvmIds]);

  const filenameItems = React.useMemo(() => {
    const a: SimpleDropdownItem[] = filenames
      .map(
        (f) =>
          ({
            value: f,
            onClick: () => setFilename(f),
            content: f,
          }) as SimpleDropdownItem,
      )
      .concat([
        {
          value: '',
          isDivider: true,
        },
        {
          value: 'Clear Selection',
          onClick: () => setFilename(''),
          content: 'Clear Selection',
        },
      ]);
    return a;
  }, [filenames]);

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

  const executeControl = React.useMemo(() => {
    return (
      <CodeEditorControl
        icon={<PlayIcon />}
        aria-label="Execute query"
        tooltipProps={{ content: 'Execute query' }}
        onClick={handleExecute}
        isLoading={loading}
        isDisabled={!jvmId || !filename || !query || loading}
      />
    );
  }, [handleExecute, jvmId, filename, query, loading]);

  return (
    <BreadcrumbPage pageTitle="Analytics">
      <Card isCompact>
        <CardHeader>
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup>
                <ToolbarItem>
                  <SimpleDropdown toggleContent={jvmId || 'JVM ID'} initialItems={jvmIdItems} />
                </ToolbarItem>
                <ToolbarItem>
                  <SimpleDropdown
                    toggleContent={filename || 'Filename'}
                    isDisabled={!jvmId}
                    initialItems={filenameItems}
                  />
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
                height="sizeToFit"
                language={Language.sql}
                isLineNumbersVisible
                isLanguageLabelVisible
                customControls={executeControl}
              />
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
