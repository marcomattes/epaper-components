import cssnano from 'cssnano';

export default {
  plugins: [
    cssnano({
      preset: [
        'default',
        {
          discardComments: {
            removeAll: true,
          },
          normalizeUnicode: false,
        },
      ],
    }),
  ],
};
