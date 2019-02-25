/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Validator from './validator';

export default class EventEntryValidator extends Validator {
  constructor(type, validator) {
    super();
    this.type = type;
    this.validator = validator;
  }

  validate(event) {
    if (!event.data) {
      return true;
    }
    event.data
      .filter((entry) => entry.type === this.type)
      .forEach((entry) => this.validator.validate(entry));
  }
}
