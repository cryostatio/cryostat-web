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
import { defaultServices } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { TargetSelect } from '@app/Shared/TargetSelect';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext } from '../Common';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';
const mockBarConnectUrl = 'service:jmx:rmi://someBarUrl';

const CUSTOM_TARGET_REALM = 'Custom Targets';

const cryostatAnnotation = {
  REALM: CUSTOM_TARGET_REALM,
};
const mockFooTarget: Target = {
  jvmId: 'abcd',
  connectUrl: mockFooConnectUrl,
  alias: 'fooTarget',
  annotations: {
    cryostat: cryostatAnnotation,
    platform: {},
  },
};
const mockBarTarget: Target = { ...mockFooTarget, jvmId: 'efgh', connectUrl: mockBarConnectUrl, alias: 'barTarget' };

const history = createMemoryHistory();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'), // Require actual implementation of utility functions for Target
}));

jest
  .spyOn(defaultServices.target, 'target')
  .mockReturnValueOnce(of()) // contains the correct information
  .mockReturnValueOnce(of()) // renders empty state when expanded
  .mockReturnValue(of(mockFooTarget)); // other tests

jest
  .spyOn(defaultServices.targets, 'targets')
  .mockReturnValueOnce(of([mockFooTarget])) // contains the correct information
  .mockReturnValueOnce(of([mockFooTarget])) // renders empty state when expanded
  .mockReturnValueOnce(of([mockFooTarget])) // renders serialized target when expanded
  .mockReturnValueOnce(of([mockFooTarget, mockBarTarget])) // renders dropdown of multiple discovered targets
  .mockReturnValue(of([mockFooTarget, mockBarTarget])); // other tests

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValue(true);

describe('<TargetSelect />', () => {
  afterEach(cleanup);

  it('contains the correct information', async () => {
    renderWithServiceContext(<TargetSelect />);

    expect(screen.getByText('Target JVM')).toBeInTheDocument();
    expect(screen.getByText(`Select a target`)).toBeInTheDocument();
  });

  it('renders empty state when expanded', async () => {
    const { container, user } = renderWithServiceContext(<TargetSelect />);

    expect(screen.getByText('Select a target')).toBeInTheDocument();

    const expandButton = screen.getByLabelText('Details');
    await user.click(expandButton);

    const articleElement = container.querySelector('article');
    expect(articleElement).toBeInTheDocument();
    expect(articleElement).toBeVisible();
    expect(screen.getByText(`No target selected`)).toBeInTheDocument();
    expect(screen.getByText(`No target selected`)).toBeVisible();
    expect(screen.getByText(`To view this content, select a JVM target.`)).toBeInTheDocument();
    expect(screen.getByText(`To view this content, select a JVM target.`)).toBeVisible();
  });

  it('renders serialized target when expanded', async () => {
    const { container, user } = renderWithServiceContext(<TargetSelect />);

    // Select a target first
    await user.click(screen.getByLabelText('Options menu'));
    await user.click(screen.getByText('fooTarget (service:jmx:rmi://someFooUrl)'));

    const expandButton = screen.getByLabelText('Details');
    await user.click(expandButton);

    const codeElement = container.querySelector('code');
    expect(codeElement).toBeTruthy();
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toBeVisible();
    expect(codeElement?.textContent).toBeTruthy();
    const codeContent = codeElement?.textContent?.replace(/[\s]/g, '');
    expect(codeContent).toEqual(JSON.stringify(mockFooTarget, null, 0).replace(/[\s]/g, ''));
  });

  it('renders dropdown of multiple discovered targets', async () => {
    const { user } = renderWithServiceContext(<TargetSelect />);

    await user.click(screen.getByLabelText('Options menu'));

    [
      CUSTOM_TARGET_REALM,
      'fooTarget (service:jmx:rmi://someFooUrl)',
      'barTarget (service:jmx:rmi://someBarUrl)',
    ].forEach((str) => {
      const element = screen.getByText(str);
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
    });
  });
});
