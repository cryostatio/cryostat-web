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

type Listener = (data: string) => void;

class MockWebSocketBroadcaster {
  private listeners: Set<Listener> = new Set();

  addListener(listener: Listener) {
    this.listeners.add(listener);
  }

  removeListener(listener: Listener) {
    this.listeners.delete(listener);
  }

  broadcast(data: unknown) {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    this.listeners.forEach((listener) => {
      try {
        listener(serialized);
      } catch (err) {
        console.error('Error broadcasting to mock websocket client:', err);
      }
    });
  }
}

export const mockWsBroadcaster = new MockWebSocketBroadcaster();
