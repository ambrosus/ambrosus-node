import config from 'config';

export default class Config {
  static get(path, pathValue) {
    return pathValue === undefined ? config.get(path) : pathValue;
  }
}
