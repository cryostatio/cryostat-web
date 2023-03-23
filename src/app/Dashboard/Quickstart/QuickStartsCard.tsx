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
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import {
  QuickStartCatalogPage,
  QuickStartContainer,
  QuickStartContainerProps,
  useLocalStorage,
} from '@patternfly/quickstarts';
import { CardActions, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
import { allQuickStarts } from '../../QuickStarts/quickstarts/dashboard-quickstarts';

export interface QuickStartsCardProps extends DashboardCardProps {}

const QuickStartsCard: React.FunctionComponent<QuickStartsCardProps> = (props) => {
  const { t, i18n } = useTranslation();
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});

  const drawerProps: QuickStartContainerProps = {
    quickStarts: allQuickStarts,
    activeQuickStartID,
    allQuickStartStates,
    setActiveQuickStartID,
    setAllQuickStartStates,
    language: i18n.language,
    alwaysShowTaskReview: true,
  };
  return (
    <DashboardCard
      dashboardId={props.dashboardId}
      cardSizes={QuickStartsCardSizes}
      isDraggable={props.isDraggable}
      isResizable={props.isResizable}
      isFullHeight={props.isFullHeight}
      cardHeader={
        <CardHeader>
          <CardTitle component="h2">{t('QuickStartsCard.TITLE')}</CardTitle>
          <CardActions>{...props.actions || []}</CardActions>
        </CardHeader>
      }
    >
      <CardBody>
        <QuickStartContainer {...drawerProps}>
          <QuickStartCatalogPage
            title={t('QuickStartsCard.CATALOG_PAGE.TITLE')}
            hint={t('QuickStartsCard.CATALOG_PAGE.HINT')}
          />
        </QuickStartContainer>
      </CardBody>
    </DashboardCard>
  );
};

const QuickStartsCardSizes = {
  span: {
    minimum: 6,
    default: 12,
    maximum: 12,
  },
  height: {
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
} as DashboardCardSizes;

export const QuickStartsCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'QuickStartsCard.CARD_TITLE',
  cardSizes: QuickStartsCardSizes,
  description: 'QuickStartsCard.CARD_DESCRIPTION',
  descriptionFull: 'QuickStartsCard.CARD_DESCRIPTION_FULL',
  component: QuickStartsCard,
  propControls: [],
} as DashboardCardDescriptor;
