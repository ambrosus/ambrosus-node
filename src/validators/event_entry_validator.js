import Validator from './validator';

export default class EventEntryValidator extends Validator {
  constructor(type, validator) {
    super();
    this.type = type;
    this.validator = validator;
  }

  validate(event) {
    if (!event.data.entries) {
      return true;
    }
    event.data.entries
      .filter((entry) => entry.type === this.type)
      .forEach((entry) => this.validator.validate(entry));
  }
}
