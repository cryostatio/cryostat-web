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

import { Card, CardProps } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { DashboardCardSizes } from './Dashboard';
import { draggableRefKlazz, DraggableRef } from './DraggableRef';
import { ResizableRef } from './ResizableRef';

export const DashboardCardContext = React.createContext<React.RefObject<HTMLDivElement>>(React.createRef());

export interface DashboardCardProps extends CardProps {
  dashboardId: number;
  cardSizes: DashboardCardSizes;
  cardHeader: React.ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
  children?: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  children = null,
  cardHeader = null,
  dashboardId,
  isDraggable = true,
  isResizable = true,
  cardSizes,

  ...props
}: DashboardCardProps) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const onMouseEnter = React.useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      cardRef.current.classList.add(`${draggableRefKlazz}-hover`);
    }
  }, []);

  const onMouseLeave = React.useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      cardRef.current.classList.remove(`${draggableRefKlazz}-hover`);
    }
  }, []);

  const resizeBar = React.useMemo(() => {
    return isResizable ? <ResizableRef dashboardId={dashboardId} cardSizes={cardSizes} /> : null;
  }, [isResizable, cardSizes, dashboardId]);

  const content = React.useMemo(
    () =>
      isDraggable ? (
        <DraggableRef dashboardId={dashboardId}>
          <div className={'dashboard-card-resizable-wrapper'} ref={cardRef}>
            <Card className="dashboard-card" isRounded {...props}>
              <div
                className={css(`${draggableRefKlazz}__grip`)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                draggable // draggable is required for drag events to fire
              >
                {cardHeader}
              </div>
              {children}
            </Card>
            {resizeBar}
          </div>
        </DraggableRef>
      ) : (
        <>
          <Card isRounded {...props}>
            {cardHeader}
            {children}
          </Card>
          {resizeBar}
        </>
      ),
    [cardRef, props, onMouseEnter, onMouseLeave, cardHeader, children, isDraggable, dashboardId, resizeBar]
  );

  return <DashboardCardContext.Provider value={cardRef}>{content}</DashboardCardContext.Provider>;
};
DashboardCard.displayName = 'DashboardCard';
