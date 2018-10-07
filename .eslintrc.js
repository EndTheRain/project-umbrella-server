module.exports = {
  'extends': 'airbnb-base',
  'rules': {
    'consistent-return': 'off',
    'no-underscore-dangle': ['error', {
      'allow': ['_id']
    }],
  },
};
