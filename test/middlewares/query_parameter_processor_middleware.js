/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import httpMocks from 'node-mocks-http';
import {ValidationError} from '../../src/errors/errors';

import queryParameterProcessorMiddleware, {
  escapeRegExpSymbols, regexifyPatternAndOptimizeTrailingStars,
  regexifyPattern
} from '../../src/middlewares/query_parameter_processor_middleware';

chai.use(sinonChai);
const {expect} = chai;

describe('Query Parameter Processor Middleware', () => {
  let response;
  let next;

  const createRequest = (query) => httpMocks.createRequest({
    query
  });

  beforeEach(async () => {
    response = httpMocks.createResponse();
    next = sinon.spy();
  });

  it('ensures non of passed parameters is object', async () => {
    const request = createRequest({
      data: {
        subparam1: 'exampleString',
        subparam2: [{anotherThing : '123'}, {oneMoreThing: '456'}]
      },
      param1: 'number(5)',
      param2: 'example2String'
    });

    expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
    expect(next).to.not.have.been.called;
  });

  describe('Number decorator', () => {
    it('casts decorated value to number', async () => {
      // from ?data[subparam1]=exampleString&data[subparam2]=number(2)&param1=number(5)&param2=example2String
      const request = createRequest({
        data: {
          subparam1: 'exampleString',
          subparam2: 'number(2)'
        },
        param1: 'number(5)',
        param2: 'example2String'
      });

      queryParameterProcessorMiddleware(request, response, next);

      expect(request.query.data.subparam2).to.be.a('number').and.equal(2);
      expect(request.query.param1).to.be.a('number').and.equal(5);
      expect(request.query.data.subparam1).to.be.a('string').and.equal('exampleString');
      expect(request.query.param2).to.be.a('string').and.equal('example2String');
      expect(next).to.have.been.calledOnce;
    });

    it('throws if decorated value is not presenting a number', async () => {
      const request = createRequest({
        something: 'number(someText)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });
  });

  describe('Geo decorator', () => {
    // from ?data[subparam1]=exampleString&data[subparam2]=geo(2,10,15)&param1=example2String
    it('casts decorated value to {lon, lat, rad} object', async () => {
      const request = createRequest({
        data: {
          subparam1: 'exampleString',
          subparam2: 'geo(2,10,15)'
        },
        param1: 'example2String'
      });

      queryParameterProcessorMiddleware(request, response, next);

      expect(request.query.data.subparam2).to.deep.include({locationLongitude : 2, locationLatitude : 10, locationMaxDistance : 15});
      expect(request.query.data.subparam1).to.be.a('string').and.equal('exampleString');
      expect(request.query.param1).to.be.a('string').and.equal('example2String');
      expect(next).to.have.been.calledOnce;
    });

    it('throws if decorated value is not presenting valid geo coordinates (missing value)', async () => {
      const request = createRequest({
        something: 'geo(2, 4)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });
    it('throws if decorated value is not presenting valid geo coordinates (surplus value)', async () => {
      const request = createRequest({
        something: 'geo(1, 2, 3, 5)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });
    it('throws if decorated value is not presenting valid geo coordinates (value out of range)', async () => {
      const request = createRequest({
        something: 'geo(200, 4, 3)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });
    it('throws if decorated value is not presenting valid geo coordinates (one of values is not a number)', async () => {
      const request = createRequest({
        something: 'geo(NaN, 4, 43)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });
  });

  describe('Pattern decorator', () => {
    it('escapeRegExpSymbols works', () => {
      const notEscapedString = '[?]()?*abc()^{}';
      const escapedString = `\\[?\\]\\(\\)?*abc\\(\\)\\^\\{\\}`;
      expect(escapeRegExpSymbols(notEscapedString)).to.equal(escapedString);
    });

    it('regexifyPattern works', async () => {
      const input = 'a?bc*def?*';
      const expectedRegex = '^a.bc.*def..*';
      expect(regexifyPattern(input)).to.equal(expectedRegex);
    });

    it('regexifyPatternAndOptimizeTrailingStars removes all `*` from the end and skips `$` character', () => {
      const input = 'a?bc*def?***';
      const expectedRegex = '^a.bc.*def.';
      expect(regexifyPatternAndOptimizeTrailingStars(input)).to.equal(expectedRegex);
    });

    it('regexifyPatternAndOptimizeTrailingStars adds `$` character if no trailing `*` found', () => {
      const input = 'a?bc*def?';
      const expectedRegex = '^a.bc.*def.$';
      expect(regexifyPatternAndOptimizeTrailingStars(input)).to.equal(expectedRegex);
    });

    it('casts decorated pattern to regex', () => {
      const request = createRequest({
        data: {
          subparam1: 'exampleString',
          subparam2: 'pattern(abc.*.de?)'
        },
        param1: 'pattern(a*)',
        param2: 'example2String'
      });

      queryParameterProcessorMiddleware(request, response, next);

      expect(request.query.data.subparam2).to.deep.equal(/^abc\..*\.de.$/);
      expect(request.query.param1).to.deep.equal(/^a/);
      expect(request.query.data.subparam1).to.be.a('string').and.equal('exampleString');
      expect(request.query.param2).to.be.a('string').and.equal('example2String');
      expect(next).to.have.been.calledOnce;
    });

    it('throws if the pattern starts with *', () => {
      const request = createRequest({
        something: 'pattern(*abc)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });

    it('throws if the pattern starts with ?', () => {
      const request = createRequest({
        something: 'pattern(?abc)',
        somethingElse: '1234'
      });
      expect(() => queryParameterProcessorMiddleware(request, response, next)).to.throw(ValidationError);
      expect(next).to.not.have.been.called;
    });
  });
});
