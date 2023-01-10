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

import * as React from 'react';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import renderer, { act } from 'react-test-renderer';
import { WebSocketDebounce } from '@app/Settings/WebSocketDebounce';
import { cleanup, screen } from '@testing-library/react';
import { renderDefault } from '../Common';

const defaultValue = 100;

jest.spyOn(defaultServices.settings, 'webSocketDebounceMs').mockReturnValue(defaultValue);

describe('<WebSocketDebounce/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.webSocketDebounceMs).mockClear();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          {React.createElement(WebSocketDebounce.content, null)}
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should set correct default period', async () => {
    renderDefault(React.createElement(WebSocketDebounce.content, null));

    const defaultInput = document.querySelector("input[type='number']") as HTMLInputElement;
    expect(defaultInput).toBeInTheDocument();
    expect(defaultInput).toBeVisible();
    expect(defaultInput.getAttribute('value')).toBe(`${defaultValue}`);
  });

  it('should save to local storage when config is changed', async () => {
    const { user } = renderDefault(React.createElement(WebSocketDebounce.content, null));

    const defaultInput = document.querySelector("input[type='number']") as HTMLInputElement;
    expect(defaultInput).toBeInTheDocument();
    expect(defaultInput).toBeVisible();
    expect(defaultInput.getAttribute('value')).toBe(`${defaultValue}`);

    const plusButton = screen.getByLabelText('Plus');
    expect(plusButton).toBeInTheDocument();
    expect(plusButton).toBeVisible();

    await user.click(plusButton);

    const newInput = document.querySelector("input[type='number']") as HTMLInputElement;
    expect(newInput).toBeInTheDocument();
    expect(newInput).toBeVisible();
    expect(defaultInput.getAttribute('value')).toBe(`${defaultValue + 1}`);
  });
});
