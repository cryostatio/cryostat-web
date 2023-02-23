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

import { MBeanMetricsResponse } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { map, mergeMap } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
import useDayjs from '@app/utils/useDayjs';

export interface JvmDetailsCardProps extends DashboardCardProps {}

export const JvmDetailsCard: React.FC<JvmDetailsCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();
  const [dayjs, dateTimeFormat] = useDayjs();

  const [target, setTarget] = React.useState(undefined as EnhancedTarget | undefined);

  React.useEffect(() => {
    addSubscription(
      context.target
        .target()
        .pipe(
          mergeMap((plain) =>
            context.api
              .graphql<MBeanMetricsResponse>(
                `
          query MBeanMXMetricsForTarget($connectUrl: String) {
            targetNodes(filter: { name: $connectUrl }) {
              mbeanMetrics {
                runtime {
                  startTime
                  vmVendor
                  vmVersion
                }
                os {
                  version
                  arch
                  availableProcessors
                }
              }
            }
          }`,
                { connectUrl: plain.connectUrl }
              )
              .pipe(
                map((resp) => ({
                  ...plain,
                  startTime: resp.data.targetNodes[0].mbeanMetrics?.runtime?.startTime || 0,
                  vmVendor: resp.data.targetNodes[0].mbeanMetrics?.runtime?.vmVendor || 'unknown',
                  vmVersion: resp.data.targetNodes[0].mbeanMetrics?.runtime?.vmVersion || 'unknown',
                  arch: resp.data.targetNodes[0].mbeanMetrics?.os?.arch || 'unknown',
                  osVersion: resp.data.targetNodes[0].mbeanMetrics?.os?.version || 'unknown',
                  availableProcessors: resp.data.targetNodes[0].mbeanMetrics?.os?.availableProcessors || -1,
                }))
              )
          )
        )
        .subscribe(setTarget)
    );
  }, [addSubscription, context.target, setTarget]);

  return (
    <DashboardCard
      id={`${props.dashboardId}`}
      dashboardId={props.dashboardId}
      cardSizes={JvmDetailsCardSizes}
      isCompact
      cardHeader={
        <CardHeader>
          <CardActions>{...props.actions || []}</CardActions>
          <CardTitle component="h4">{t('JvmDetailsCard.CARD_TITLE')}</CardTitle>
        </CardHeader>
      }
    >
      <CardBody>
        <DescriptionList isCompact isHorizontal isFluid>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.CONNECTION_URL')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.connectUrl}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.ALIAS')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.alias}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.START_TIME')}</DescriptionListTerm>
            <DescriptionListDescription>
              {dayjs(target?.startTime).tz(dateTimeFormat.timeZone.full).format('LLLL')}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.LABELS')}</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {Object.entries(target?.labels || {}).map(([key, value]) => (
                  <Label key={'label-' + key} color="blue">
                    {key}={value}
                  </Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.PLATFORM_ANNOTATIONS')}</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {Object.entries(target?.annotations?.platform || {}).map(([key, value]) => (
                  <Label key={'platform-annotation-' + key} color="cyan">
                    {key}={value}
                  </Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.CRYOSTAT_ANNOTATIONS')}</DescriptionListTerm>
            <DescriptionListDescription>
              <LabelGroup>
                {Object.entries(target?.annotations?.cryostat || {}).map(([key, value]) => (
                  <Label key={'cryostat-annotation-' + key} color="green">
                    {key}={value}
                  </Label>
                ))}
              </LabelGroup>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.VM_VERSION')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.vmVersion}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.VM_VENDOR')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.vmVendor}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.OS_ARCH')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.arch}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.OS_VERSION')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.osVersion}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.AVAILABLE_PROCESSORS')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.availableProcessors}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('JvmDetailsCard.terms.JVM_ID')}</DescriptionListTerm>
            <DescriptionListDescription>{target?.jvmId}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </DashboardCard>
  );
};

interface EnhancedTarget extends Target {
  arch: string;
  availableProcessors: number;
  osVersion: string;
  startTime: number;
  vmVendor: string;
  vmVersion: string;
}

export const JvmDetailsCardSizes: DashboardCardSizes = {
  span: {
    minimum: 4,
    default: 4,
    maximum: 12,
  },
  height: {
    // TODO: implement height resizing
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
};

export const JvmDetailsCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'JvmDetailsCard.CARD_TITLE',
  cardSizes: JvmDetailsCardSizes,
  description: 'JvmDetailsCard.CARD_DESCRIPTION',
  descriptionFull: `JvmDetailsCard.CARD_DESCRIPTION_FULL`,
  component: JvmDetailsCard,
  propControls: [],
};
