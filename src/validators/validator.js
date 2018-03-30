/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
export default class Validator {  
  isValid(_eventData) {
    throw new Error('Abstract class');
  }

  validate(_json) {
    throw new Error('Abstract class');
  }
}
