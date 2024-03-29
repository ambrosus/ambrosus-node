/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {Logger} from '../../src/utils/loggers';

class EmptyLogger extends Logger {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  info() { }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error() { }
}

export default EmptyLogger;
