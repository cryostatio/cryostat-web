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

import build from '@app/build.json';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Text,
  TextVariants,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ServiceContext } from '../Services/Services';

export interface ErrorBoundaryProps {
  renderFallback: (error: Error) => React.ReactNode;
  children?: React.ReactNode;
}

export interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return this.props.renderFallback(this.state.error);
    }
    return this.props.children;
  }
}

export interface DefaultFallBackProps {
  error?: Error;
}

export const DefaultFallBack: React.FC<DefaultFallBackProps> = ({ error, ...props }) => {
  const { t } = useTranslation();
  const addSubcription = useSubscriptions();
  const serviceContext = React.useContext(ServiceContext);
  const [cryostatVersion, setCryostatVersion] = React.useState(undefined as string | undefined);

  React.useEffect(() => {
    addSubcription(serviceContext.api.cryostatVersion().subscribe(setCryostatVersion));
  }, [serviceContext, setCryostatVersion, addSubcription]);

  return (
    <Bullseye {...props}>
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText={<>{t('SOMETHING_WENT_WRONG', { ns: 'common' })}</>}
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} color="red" />}
          headingLevel={'h1'}
        />
        <EmptyStateBody>
          <p>{t('ERROR_BOUNDARY.ERROR_MESSAGE', { message: error?.message || 'Unknown error.' })}</p>
          <Trans
            t={t}
            values={{
              knownIssue: t('AboutDescription.KNOWN_ISSUES'),
              fileReport: t('AboutDescription.FILE_A_REPORT'),
            }}
            components={{
              issue: <Text component={TextVariants.a} target="_blank" href={build.knownIssuesUrl} />,
              report: (
                <Text
                  component={TextVariants.a}
                  target="_blank"
                  href={build.fileIssueUrl.replace('__REPLACE_VERSION__', cryostatVersion || 'unknown')}
                />
              ),
            }}
          >
            ERROR_BOUNDARY.RESOLVE_MESSAGE
          </Trans>
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};
