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

import build from '@app/build.json';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Text,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ServiceContext } from './Services/Services';

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
      <EmptyState variant={EmptyStateVariant.large}>
        <EmptyStateIcon icon={ExclamationCircleIcon} color="red" />
        <Title headingLevel={'h1'}>{t('SOMETHING_WENT_WRONG', { ns: 'common' })}</Title>
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
