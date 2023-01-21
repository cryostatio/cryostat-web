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
import { TimezonePicker } from '@app/DateTimePicker/TimezonePicker';
import dayjs, { supportedTimezones, Timezone } from '@i18n/datetime';
import { act, cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { renderDefault } from '../Common';

jest.mock('@i18n/datetime', () => ({
  ...jest.requireActual('@i18n/datetime'),
  __esModule: true,
  supportedTimezones: () =>
    [
      {
        full: 'UTC',
        short: 'UTC',
      },
      {
        full: 'America/Toronto',
        short: 'EST',
      },
    ] as Timezone[],
}));

const onTimezoneChange = jest.fn((_: Timezone) => undefined);

describe('<TimezonePicker/>', () => {
  beforeEach(() => {
    jest.mocked(onTimezoneChange).mockReset();
  });

  afterEach(cleanup);

  it('should correctly show selected', async () => {
    await act(async () => {
      renderDefault(<TimezonePicker selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />);
    });

    const displaySelected = screen.getByText(
      `(UTC${dayjs().tz(supportedTimezones()[0].full).format('Z')}) ${supportedTimezones()[0].full}`
    );
    expect(displaySelected).toBeInTheDocument();
    expect(displaySelected).toBeVisible();
  });

  it('should show correct timezone options', async () => {
    let user;
    await act(async () => {
      user = renderDefault(
        <TimezonePicker selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />
      ).user;
    });

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText('Select a timezone');
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    supportedTimezones()
      .map((t) => t.full)
      .forEach((full) => {
        const option = within(ul).getByText(`(UTC${dayjs().tz(full).format('Z')}) ${full}`);
        expect(option).toBeInTheDocument();
        expect(option).toBeVisible();
      });
  });

  it('should correctly show selected in compact mode', async () => {
    await act(async () => {
      renderDefault(
        <TimezonePicker isCompact selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />
      );
    });

    const displaySelected = screen.getByText(supportedTimezones()[0].short);
    expect(displaySelected).toBeInTheDocument();
    expect(displaySelected).toBeVisible();
  });

  it('should show correct timezone options in compact mode', async () => {
    let user;
    await act(async () => {
      user = renderDefault(
        <TimezonePicker isCompact selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />
      ).user;
    });

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText('Select a timezone');
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    supportedTimezones()
      .map((t) => t.short)
      .forEach((short) => {
        // Might be same full and short (e.g. UTC)
        const optionDetails = within(ul).getAllByText(short);
        optionDetails.forEach((d) => {
          expect(d).toBeInTheDocument();
          expect(d).toBeVisible();
        });
      });
  });

  it('should select a timezone when an option is clicked', async () => {
    let user;
    await act(async () => {
      user = renderDefault(
        <TimezonePicker selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />
      ).user;
    });

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText('Select a timezone');
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    const toSelect = supportedTimezones()[1];
    const toSelectText = `(UTC${dayjs().tz(toSelect.full).format('Z')}) ${toSelect.full}`;

    await act(async () => {
      await user.click(within(ul).getByText(toSelectText));
    });

    expect(ul).not.toBeVisible();
    expect(onTimezoneChange).toHaveBeenCalledTimes(1);
    expect(onTimezoneChange).toHaveBeenCalledWith(toSelect);
  });
});
