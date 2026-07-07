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

import { ChartLabel, ChartLegend, ChartPie } from '@patternfly/react-charts/victory';
import { Bullseye, CardBody } from '@patternfly/react-core';

export interface ChartData {
  x?: any;
  y?: number;
  name?: string;
}
export interface AggregateLegendData {
  name: string;
}

export interface AggregateDataCardProps {
  data: { data: any; count: number }[] | undefined;
  title: string;
  description: string;
  width?: number;
  height?: number;
  legendPadding?: number;
}

export const AggregateDataCard: React.FC<AggregateDataCardProps> = (props) => {
  const legendData: ChartData[] | undefined = props.data
    ?.sort((a, b) => {
      return b.count - a.count;
    })
    .map((t) => {
      return { name: `${t.data}: ${t.count}` };
    });

  const chartData: ChartData[] | undefined = props.data?.map((t) => {
    return { x: t.data, y: t.count };
  });

  return (
    <>
      <Bullseye>
        <CardBody isFilled>
          <ChartPie
            ariaDesc={props.description}
            ariaTitle={props.title}
            constrainToVisibleArea
            data={chartData}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            legendData={legendData}
            legendOrientation="vertical"
            legendPosition="right"
            legendComponent={
              <ChartLegend
                labelComponent={
                  <ChartLabel
                    style={{
                      fill: 'var(--pf-t--global--text--color--regular)',
                    }}
                  />
                }
              />
            }
            height={props.height ? props.height : 350}
            width={props.width ? props.width : 900}
            padding={{
              bottom: 20,
              left: 20,
              right: props.legendPadding ? props.legendPadding : 140, // Adjusted to accommodate legend
              top: 20,
            }}
            name="chart1"
          />
        </CardBody>
      </Bullseye>
    </>
  );
};
