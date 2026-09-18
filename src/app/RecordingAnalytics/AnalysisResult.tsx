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

import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { CodeEditor, CodeEditorControl, CodeEditorProps } from '@patternfly/react-code-editor';
import { CopyIcon } from '@patternfly/react-icons';
import * as React from 'react';

export type AnalysisResultProps = Omit<CodeEditorProps, 'isReadOnly'>;

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ code, customControls, ...rest }) => {
  const { t } = useCryostatTranslation();

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(code ?? '');
  }, [code]);

  const copyControl = React.useMemo(
    () => (
      <CodeEditorControl
        icon={<CopyIcon />}
        aria-label={t('RecordingAnalytics.AnalysisResult.ARIA_LABELS.COPY_RESULT')}
        tooltipProps={{ content: t('RecordingAnalytics.AnalysisResult.COPY_RESULT') }}
        onClick={handleCopy}
        isDisabled={!code}
      />
    ),
    [handleCopy, code, t],
  );

  const allControls = React.useMemo(() => {
    const extra = customControls ? (Array.isArray(customControls) ? customControls : [customControls]) : [];
    return [...extra, copyControl];
  }, [customControls, copyControl]);

  return <CodeEditor isReadOnly code={code} customControls={allControls} {...rest} />;
};

export default AnalysisResult;
