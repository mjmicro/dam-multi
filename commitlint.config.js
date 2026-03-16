export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // new feature
        'fix', // bug fix
        'chore', // maintenance, tooling
        'docs', // documentation
        'style', // formatting, no logic change
        'refactor', // code change, no feature or fix
        'perf', // performance improvement
        'test', // adding or updating tests
        'build', // build system changes
        'ci', // CI/CD changes
        'revert', // reverting a commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
};
