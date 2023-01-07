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
import { CardConfig } from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { Dropdown, DropdownItem, gridSpans, KebabToggle } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

export interface DashboardCardActionProps {
  idx: number;
  defaultSpan: gridSpans;
  onRemove: () => void;
  onResize: () => void;
}

export const DashboardCardActionMenu: React.FunctionComponent<DashboardCardActionProps> = (props) => {
  const cardConfigs: CardConfig[] = useSelector((state: RootState) => state.dashboardConfigs.list);
  const [isOpen, setOpen] = React.useState(false);

  const [t] = useTranslation();

  const onSelect = React.useCallback(
    (_) => {
      setOpen(false);
    },
    [setOpen]
  );

  return (
    <>
      <Dropdown
        isPlain
        isFlipEnabled
        menuAppendTo={'parent'}
        position={'right'}
        isOpen={isOpen}
        toggle={<KebabToggle onToggle={setOpen} />}
        onSelect={onSelect}
        dropdownItems={[
          <DropdownItem key="Remove" onClick={props.onRemove}>
            {t('REMOVE', { ns: 'common' })}
          </DropdownItem>,
          props.defaultSpan == 12 ? null : (
            <DropdownItem key="Resize" onClick={props.onResize}>
              {cardConfigs[props.idx].span === props.defaultSpan
                ? t('EXPAND', { ns: 'common' })
                : t('DashboardCardActionMenu.SHRINK', { val: props.defaultSpan })}
            </DropdownItem>
          ),
        ].filter((item) => item !== null)}
      />
    </>
  );
};
