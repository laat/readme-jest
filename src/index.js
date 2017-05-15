const endOfLine = require('os').EOL;
const pa = require('path');
const readPkg = require('read-pkg');
const babel = require('babel-core');
const commonjs = require('babel-plugin-transform-es2015-modules-commonjs');
const transformImport = require('babel-plugin-transform-rename-import').default;

const blockRe = /^([ \t]*(`{3,4}|~{3,4}))\s?(\w+)?\s?(\w+)?(\w+)?\s?(\w+)?(\w+)?(\w+)?\s?(\w+)?/;
function testCode(src) {
  const lines = src.split('\n');
  const result = [];

  let insideBlock = false;
  let currentTags = [];
  let currentBlockStart = null;
  lines.forEach((line) => {
    const match = line.match(blockRe);
    if (match != null) {
      const mdStart = match[1];
      const isClosing = insideBlock && mdStart === currentBlockStart;
      if (isClosing) {
        currentTags = [];
        currentBlockStart = null;
      } else {
        currentTags = match.slice(3).filter(g => !!g);
        currentBlockStart = mdStart;
      }
      result.push('');
      insideBlock = !insideBlock;
    } else if (insideBlock && currentTags.includes('test')) {
      result.push(line);
    } else {
      result.push('');
    }
  });
  return result.join(endOfLine);
}

function testMain(src, path) {
  try {
    const pkg = readPkg.sync(pa.join(pa.dirname(path), 'package.json'));
    let replacement;
    const matches = src.match(/<!-- test-main: "(.*)" -->/);
    if (matches) {
      replacement = matches[1];
    } else if (pkg.main) {
      replacement = pkg.main;
    } else {
      replacement = 'index.js';
    }
    return {
      original: pkg.name || pa.basename(pa.dirname(path)),
      replacement,
    };
  } catch (err) {
    return {
      original: pa.basename(pa.dirname(path)),
      replacement: 'index.js',
    };
  }
}

const arrowRegex = /^\s?(=>|→|throws|Promise|resolves to)/;
const commentVisitor = ({ types: t, transform }) => {
  const assertAwaitExpression = (actual, expected, loc) => {
    const exp = t.callExpression(
      t.identifier('it'),
      [
        t.stringLiteral('readme'),
        t.arrowFunctionExpression(
          [],
          t.blockStatement([t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.identifier('expect'),
                  [t.AwaitExpression(actual)]
                ),
                t.identifier('toEqual')
              ),
              [expected]
            )
          )])
        , true),
      ]
    );
    exp.loc = loc;
    return exp;
  };
  const assertExpression = (actual, expected, loc) => {
    const exp = t.callExpression(
      t.identifier('it'),
      [
        t.stringLiteral('readme'),
        t.arrowFunctionExpression(
          [],
          t.blockStatement([t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.identifier('expect'),
                  [actual]
                ),
                t.identifier('toEqual')
              ),
              [expected]
            )
          )])
        ),
      ]
    );
    exp.loc = loc;
    return exp;
  };
  const throwsExpression = (body, arg, loc) => {
    const exp = t.callExpression(
      t.identifier('it'),
      [
        t.stringLiteral('readme throws'),
        t.arrowFunctionExpression(
          [],
          t.blockStatement([t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.identifier('expect'),
                  [t.arrowFunctionExpression(
                    [],
                    t.blockStatement([
                      t.expressionStatement(body),
                    ])
                  )]
                ),
                t.identifier('toThrowError')
              ), [arg]
            )
          )])
        ),
      ]
    );
    exp.loc = loc;
    return exp;
  };
  return {
    visitor: {
      ExpressionStatement(path) {
        const comments = path.node.trailingComments;
        if (comments &&
          comments.length > 0 &&
          comments[0].value.match(arrowRegex)
        ) {
          const matches = comments[0].value.match(arrowRegex);
          const child = path.node.expression;
          const throws = matches[1] === 'throws';
          const promise = matches[1] === 'Promise' || 'resolves to';
          const commentLoc = comments[0].loc;
          const rawComment = comments[0].value.replace(arrowRegex, '').trim();
          const comment = transform(`async () => (${rawComment})`).ast.program.body[0].expression.body;
          path.node.trailingComments = comments.splice(1); // eslint-disable-line
          if (throws) {
            path.replaceWith(throwsExpression(child, comment, commentLoc));
          } else if (promise) {
            path.replaceWith(assertAwaitExpression(child, comment, commentLoc));
          } else {
            path.replaceWith(assertExpression(child, comment, commentLoc));
          }
        }
      },
    },
  };
};

exports.process = function process(src, path) {
  const preCode = testCode(src);
  if (preCode.trim() === '') {
    return 'it("readme has no test")';
  }
  const code = babel.transform(preCode, {
    retainLines: true,
    filename: path,
    plugins: [
      commentVisitor,
      [transformImport, testMain(src, path)],
      commonjs,
    ],
  }).code;
  return code;
};
