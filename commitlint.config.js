export default {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: true,
  ignores: [
    (msg) => msg.startsWith('Merge branch'),
    (msg) => msg.startsWith('Merge pull request'),
    (msg) => /^[A-Z][^\n]*\(#\d+\)/.test(msg),
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'test', 'chore', 'ci', 'perf', 'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth', 'booking', 'room', 'guest', 'payment',
        'report', 'deps', 'ci', 'db',
        'frontend', 'backend',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};