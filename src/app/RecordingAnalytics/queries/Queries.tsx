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
import { loader } from '@monaco-editor/react';
import { CodeEditor, CodeEditorControl, Language } from '@patternfly/react-code-editor';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { ListIcon, PlayIcon } from '@patternfly/react-icons';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import { concatMap } from 'rxjs';

loader.config({ monaco });

interface SampleQuery {
  id: string;
  description: string;
  query: string;
}

const SAMPLE_QUERIES: SampleQuery[] = [
  {
    id: 'list-jfr-events',
    description: 'List available JFR events (tables)',
    query: 'tables',
  },
  {
    id: 'list-jfr-event-fields',
    description: 'List fields within a JFR event type',
    query: 'columns $TABLE_NAME',
  },
  {
    id: 'count-allocations',
    description: 'Count object allocation sample events',
    query: 'SELECT COUNT(*) FROM jfr."jdk.ObjectAllocationSample"',
  },
  {
    id: 'top-allocating-stacktraces',
    description: 'Top 10 allocating stacktraces',
    query: `SELECT TRUNCATE_STACKTRACE("stackTrace", 40), SUM("weight")
        FROM jfr."jdk.ObjectAllocationSample"
        GROUP BY TRUNCATE_STACKTRACE("stackTrace", 40)
        ORDER BY SUM("weight") DESC
        LIMIT 10`,
  },
  {
    id: 'top-classes-by-allocation',
    description: 'Top 20 classes by allocation count',
    query: `SELECT CLASS_NAME("objectClass") AS "class_name",
        COUNT(*) AS "allocation_count"
        FROM jfr."jdk.ObjectAllocationSample"
        GROUP BY CLASS_NAME("objectClass")
        ORDER BY COUNT(*) DESC
        LIMIT 20`,
  },
  {
    id: 'cpu-load-statistics',
    description: 'CPU load statistics (min/max/avg for JVM and machine)',
    query: `SELECT
        MIN("jvmUser") as "min_jvm_user",
        MAX("jvmUser") as "max_jvm_user",
        AVG("jvmUser") as "avg_jvm_user",
        MIN("machineTotal") as "min_machine_total",
        MAX("machineTotal") as "max_machine_total",
        AVG("machineTotal") as "avg_machine_total"
        FROM jfr."jdk.CPULoad"`,
  },
  {
    id: 'cpu-load-p95',
    description: 'CPU load 95th percentile (jvmUser)',
    query: `SELECT "jvmUser"
            FROM (
                SELECT "jvmUser",
                      ROW_NUMBER() OVER (ORDER BY "jvmUser" DESC) as rn,
                      COUNT(*) OVER () as total
                FROM jfr."jdk.CPULoad"
            )
            WHERE rn = CAST(total * 0.05 AS INTEGER)`,
  },
  {
    id: 'first-class-loaded-detailed',
    description: 'First class loaded by JVM (detailed)',
    query: `SELECT "startTime", "loadedClass", "initiatingClassLoader", "definingClassLoader"
        FROM jfr."jdk.ClassLoad"
        ORDER by "startTime"
        LIMIT 1`,
  },
  {
    id: 'first-class-name',
    description: 'Name of first class loaded by JVM',
    query: `SELECT CLASS_NAME("loadedClass") as className
        FROM jfr."jdk.ClassLoad"
        ORDER by "startTime"
        LIMIT 1`,
  },
  {
    id: 'terminated-threads',
    description: 'Information about terminated threads',
    query: `SELECT ts."parentThread"."javaName", ts."thread"."javaName", ts."thread"."javaThreadId", te."thread"."javaName", te."thread"."javaThreadId"
        FROM jfr."jdk.ThreadStart" ts
        LEFT JOIN jfr."jdk.ThreadEnd" te ON ts."thread"."javaThreadId" = te."thread"."javaThreadId"
        ORDER BY ts."thread"."javaThreadId"`,
  },
];

export interface QueriesProps {
  jvmId: string;
  filename: string;
}

export const Queries: React.FC<QueriesProps> = ({ jvmId, filename }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [theme] = useTheme();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState('');
  const [isSampleMenuOpen, setIsSampleMenuOpen] = React.useState(false);
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const sampleQueryInsertedRef = React.useRef(false);

  const onEditorDidMount = React.useCallback((editor, monaco) => {
    editorRef.current = editor;
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0].updateOptions({ tabSize: 4 });
  }, []);

  React.useEffect(() => {
    if (editorRef.current && query && sampleQueryInsertedRef.current) {
      sampleQueryInsertedRef.current = false;
      const timer = setTimeout(() => {
        const editor = editorRef.current;
        if (editor) {
          const model = editor.getModel();
          if (model) {
            const position = editor.getPosition();
            const endPosition = model.getFullModelRange().getEndPosition();
            editor.executeEdits('', [
              {
                range: new monaco.Range(
                  endPosition.lineNumber,
                  endPosition.column,
                  endPosition.lineNumber,
                  endPosition.column,
                ),
                text: ' ',
              },
            ]);
            editor.executeEdits('', [
              {
                range: new monaco.Range(
                  endPosition.lineNumber,
                  endPosition.column,
                  endPosition.lineNumber,
                  endPosition.column + 1,
                ),
                text: '',
              },
            ]);
            if (position) {
              editor.setPosition(position);
            }
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [query]);

  const handleSampleQuerySelect = React.useCallback(
    (sampleQuery: string) => {
      sampleQueryInsertedRef.current = true;
      setQuery(sampleQuery);
      setIsSampleMenuOpen(false);
    },
    [setQuery],
  );

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

  const sampleQueryControl = React.useMemo(() => {
    return (
      <Dropdown
        isOpen={isSampleMenuOpen}
        onSelect={() => setIsSampleMenuOpen(false)}
        onOpenChange={(isOpen: boolean) => setIsSampleMenuOpen(isOpen)}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <Tooltip content={t('RecordingAnalytics.Queries.INSERT_SAMPLE_QUERY')}>
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsSampleMenuOpen(!isSampleMenuOpen)}
              isExpanded={isSampleMenuOpen}
              variant="plain"
              aria-label={t('RecordingAnalytics.Queries.ARIA_LABELS.INSERT_SAMPLE_QUERY')}
              isDisabled={loading}
              className="pf-v6-c-code-editor__controls-item"
            >
              <ListIcon />
            </MenuToggle>
          </Tooltip>
        )}
      >
        <DropdownList>
          {SAMPLE_QUERIES.map((sample) => (
            <DropdownItem key={sample.id} onClick={() => handleSampleQuerySelect(sample.query)}>
              {sample.description}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    );
  }, [isSampleMenuOpen, loading, handleSampleQuerySelect]);

  const executeControl = React.useMemo(() => {
    return (
      <CodeEditorControl
        icon={<PlayIcon />}
        aria-label={t('RecordingAnalytics.Queries.ARIA_LABELS.EXECUTE_QUERY')}
        tooltipProps={{ content: t('RecordingAnalytics.Queries.EXECUTE_QUERY') }}
        onClick={handleExecute}
        isLoading={loading}
        isDisabled={!jvmId || !filename || !query || loading}
      />
    );
  }, [handleExecute, jvmId, filename, query, loading]);

  return (
    <Stack hasGutter>
      <StackItem>
        <CodeEditor
          isDarkTheme={theme === ThemeSetting.DARK}
          code={query}
          onChange={setQuery}
          onEditorDidMount={onEditorDidMount}
          height="sizeToFit"
          language={Language.sql}
          isLineNumbersVisible
          isLanguageLabelVisible
          customControls={[executeControl, sampleQueryControl]}
        />
      </StackItem>
      <StackItem>
        <AnalysisResult
          isDarkTheme={theme === ThemeSetting.DARK}
          height="sizeToFit"
          isLineNumbersVisible
          isLanguageLabelVisible
          language={Language.json}
          code={result}
        />
      </StackItem>
    </Stack>
  );
};

export default Queries;
