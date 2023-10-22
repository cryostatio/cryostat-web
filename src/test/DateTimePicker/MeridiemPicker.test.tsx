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

import { MeridiemPicker } from '@app/DateTimePicker/MeridiemPicker';
import { cleanup, screen } from '@testing-library/react';
import { render, renderSnapshot, testT } from '../utils';

const onSelect = jest.fn((_: boolean) => undefined);

describe('<MeridiemPicker/>', () => {
  beforeEach(() => {
    jest.mocked(onSelect).mockReset();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <MeridiemPicker onSelect={onSelect} />,
          },
        ],
      },
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should select a meridiem when click', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <MeridiemPicker onSelect={onSelect} />,
          },
        ],
      },
    });

    const pm = screen.getByText(testT('MERIDIEM_PM', { ns: 'common' }));
    expect(pm).toBeInTheDocument();
    expect(pm).toBeVisible();

    await user.click(pm);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(false);
  });
});
