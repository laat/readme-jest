# readme-jest [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url]
[travis-image]: https://img.shields.io/travis/laat/readme-jest.svg?style=flat
[travis-url]: https://travis-ci.org/laat/readme-jest
[npm-image]: https://img.shields.io/npm/v/laat-readme-jest.svg?style=flat
[npm-url]: https://npmjs.org/package/laat-readme-jest

*WIP!* use with caution

> Execute code blocks with jest

## Install 
```
npm install -D laat-readme-jest
```

## jest config
```js
module.exports = {
  transform: {
    'readme.md': 'laat-readme-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  testMatch: [
    '**/readme.md',
    '**/__tests__/**/*.js?(x)',
    '**/?(*.)(spec|test).js?(x)',
  ],
  moduleFileExtensions: [
    'md',
    'js',
  ],
};
```
script:s
  - 'npm run lint'

## basic
```javascript test
true; // => true
```

## import from package main
```javascript test
// To override main to import use the magic comment in markdown
// <!-- test-main: "./__test__" -->

import helloWorld from 'laat-readme-jest';
helloWorld(); // => 'hello-world'
```

## throws
```javascript test
const a = () => {
  throw new Error('MyError');
};
a(); // throws /MyError/
```

## Promises
```javascript test
const b = Promise.resolve('foobar')
b; // Promise 'foobar'
```

```javascript test
const d = Promise.resolve('foobar')
d; // resolves to 'foobar'
```

<!-- test-main: "./__test__" -->
