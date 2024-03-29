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

import { WebSocketDebounce } from '@app/Settings/Config/WebSocketDebounce';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import { render, renderSnapshot } from '../utils';

const defaultValue = 100;

jest.spyOn(defaultServices.settings, 'webSocketDebounceMs').mockReturnValue(defaultValue);

describe('<WebSocketDebounce/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.webSocketDebounceMs).mockClear();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(WebSocketDebounce.content, null),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should set correct default period', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(WebSocketDebounce.content, null),
          },
        ],
      },
    });

    const webSocketDebounceInput = document.querySelector("input[type='number']") as HTMLInputElement;
    expect(webSocketDebounceInput).toBeInTheDocument();
    expect(webSocketDebounceInput).toBeVisible();
    expect(webSocketDebounceInput.getAttribute('value')).toBe(`${defaultValue}`);
  });

  it('should save to local storage when config is changed', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(WebSocketDebounce.content, null),
          },
        ],
      },
    });

    const webSocketDebounceInput = document.querySelector("input[type='number']") as HTMLInputElement;
    expect(webSocketDebounceInput).toBeInTheDocument();
    expect(webSocketDebounceInput).toBeVisible();
    expect(webSocketDebounceInput.getAttribute('value')).toBe(`${defaultValue}`);

    const plusButton = screen.getByLabelText('Plus');
    expect(plusButton).toBeInTheDocument();
    expect(plusButton).toBeVisible();

    await user.click(plusButton);

    expect(webSocketDebounceInput.getAttribute('value')).toBe(`${defaultValue + 1}`);
  });
});
