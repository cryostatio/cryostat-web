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

import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { Target } from '@app/Shared/Services/Target.service';

const fakeTarget: Target = {
  jvmId: 'rpZeYNB9wM_TEnXoJvAFuR0jdcUBXZgvkXiKhjQGFvY=',
  connectUrl: 'service:jmx:rmi:///jndi/rmi://10-128-2-25.my-namespace.pod:9097/jmxrmi',
  alias: 'quarkus-test-77f556586c-25bkv',
  labels: {
    'pod-template-hash': '77f556586c',
    deployment: 'quarkus-test',
  },
  annotations: {
    cryostat: {
      HOST: '10.128.2.25',
      PORT: '9097',
      POD_NAME: 'quarkus-test-77f556586c-25bkv',
      REALM: 'KubernetesApi',
      NAMESPACE: 'my-namespace',
    },
    platform: {},
  },
};

const fakeAARecording: ActiveRecording = {
  name: 'automated-analysis',
  downloadUrl:
    'https://clustercryostat-sample-default.apps.ci-ln-25fg5f2-76ef8.origin-ci-int-aws.dev.rhcloud.com:443/api/v1/targets/service:jmx:rmi:%2F%2F%2Fjndi%2Frmi:%2F%2F10-128-2-27.my-namespace.pod:9097%2Fjmxrmi/recordings/automated-analysis',
  reportUrl:
    'https://clustercryostat-sample-default.apps.ci-ln-25fg5f2-76ef8.origin-ci-int-aws.dev.rhcloud.com:443/api/v1/targets/service:jmx:rmi:%2F%2F%2Fjndi%2Frmi:%2F%2F10-128-2-27.my-namespace.pod:9097%2Fjmxrmi/reports/automated-analysis',
  metadata: {
    labels: {
      'template.name': 'Profiling',
      'template.type': 'TARGET',
      origin: 'automated-analysis',
    },
  },
  startTime: 1680732807,
  id: 0,
  state: RecordingState.RUNNING,
  duration: 0, // Continuous
  continuous: false,
  toDisk: false,
  maxSize: 1048576,
  maxAge: 0,
};
