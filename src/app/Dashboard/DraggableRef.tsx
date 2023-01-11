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
import { dashboardCardConfigResizeCardIntent } from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { gridSpans } from '@patternfly/react-core';
import _ from 'lodash';
import React from 'react';
import { useDispatch } from 'react-redux';
import { DashboardCardContext } from './ResizableCard';

export interface DraggableRefProps {
  dashboardIdx: number;
}

export const DraggableRef: React.FunctionComponent<DraggableRefProps> = (props) => {
  const dispatch = useDispatch();

  const cardRef = React.useContext(DashboardCardContext);
  const draggableRef = React.useRef<HTMLDivElement>(null);
  const isResizing = React.useRef<boolean>(false);
  const setInitialVals = React.useRef<boolean>(true);

  const SMALLEST_CARD_WIDTH = 120;

  let cardLeft: number;

  function normalize(val, min, max) {
    if (val < 0) val = 0;
    else if (val > max) val = max;
    let ans = Math.round(((val - min) / (max - min)) * 11) + 1;

    return _.clamp(ans, 1, 12) as gridSpans;
  }

  const handleResize = (span: gridSpans) => {
    dispatch(dashboardCardConfigResizeCardIntent(props.dashboardIdx, span));
  };

  const handleOnMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    console.log(cardRef.current);
    e.stopPropagation();
    e.preventDefault();
    document.body.style.setProperty('cursor', 'col-resize');
    document.addEventListener('mousemove', callbackMouseMove);
    document.addEventListener('mouseup', callbackMouseUp);
    isResizing.current = true;
    setInitialVals.current = true;
  };

  const handleMouseMove = (e: MouseEvent) => {
    const mousePos = e.clientX;
    e.stopPropagation();
    if (!isResizing.current) {
      return;
    }
    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      cardLeft = cardRect.left + SMALLEST_CARD_WIDTH;

      if (setInitialVals.current) {
        setInitialVals.current = false;
      }
      const newSize = mousePos;
      let gridSpan = normalize(newSize, cardLeft, window.visualViewport?.width) as gridSpans;

      handleResize(gridSpan);
    }
  };

  const handleOnMouseUp = () => {
    if (!isResizing.current) {
      return;
    }
    isResizing.current = false;
    setInitialVals.current = true;
    document.body.style.removeProperty('cursor');
    document.removeEventListener('mousemove', callbackMouseMove);
    document.removeEventListener('mouseup', callbackMouseUp);
  };

  const callbackMouseMove = React.useCallback(handleMouseMove, []);
  const callbackMouseUp = React.useCallback(handleOnMouseUp, []);

  return (
    <div
      ref={draggableRef}
      className="card"
      onMouseDown={handleOnMouseDown}
      style={{
        cursor: 'col-resize',
        position: 'relative',
        borderRight: '4px outset black',
        borderBottomRightRadius: '16px',
      }}
    ></div>
  );
};
